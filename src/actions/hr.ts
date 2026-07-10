"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireHrPortalAccess, isNextNavigationError } from "@/lib/action-auth";
import { EMPLOYEE_TYPES, needsCheckHoursOnHrCheck, normalizeManagerDepartment, REQUEST_TYPES } from "@/lib/constants";
import { parseCutoffPeriodId } from "@/lib/cutoff";
import { createCompany, isActiveCompany, updateCompany } from "@/lib/companies";
import { listDepartments } from "@/lib/departments";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import {
  canHrCheckRequest,
  canHrEditRequest,
  filterPayrollOfficerRfRequests,
  isDirectHrConfiOwnSlip,
  payrollOfficerCheckedTab,
  payrollOfficerPendingTab,
} from "@/lib/hr-portal-access";
import {
  employeePortalRequestTypes,
  validateEmployeePortalOtFeatures,
} from "@/lib/employee-portal";
import { parseOptionalBiometricNo } from "@/lib/biometric";
import {
  getPayrollCutoffRule,
  saveOtEligibleTypes,
  updatePayrollCutoffRule,
  validateCutoffDays,
} from "@/lib/ot-settings";
import {
  adminUpdateRequest,
  archiveRequest,
  confirmPayrollPeriodRequests,
  getArchivedRequests,
  getRequestByRefId,
  hrReturnApprovedToManager,
  unarchiveRequest,
} from "@/lib/requests";
import { readOtHoursFromFormData, formatOtHoursLabel } from "@/lib/ot-hours";
import { parseOtHours } from "@/lib/ot-summary";
import {
  buildEmployeeTypeLookup,
  createEmployee,
  getEmployeeByPlacement,
  isBiometricNoTaken,
  listEmployees,
  updateEmployee,
} from "@/lib/roster";
import { createUser, getUserById, getUserByUsername, findPortalRoleConflict, updateUser } from "@/lib/users";

function hrRedirect(
  params: {
    tab?: string;
    success?: string;
    error?: string;
    settings?: boolean;
    period?: string;
    ot_group?: string;
    ot_basis?: string;
    ot_period?: string;
    ot_start?: string;
    ot_end?: string;
    ot_custom?: string;
    ot_company?: string;
    ot_department?: string;
    ot_employee?: string;
    edit_ref?: string;
  } = {},
): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  if (params.settings) search.set("settings", "1");
  if (params.period) search.set("period", params.period);
  if (params.edit_ref) search.set("edit_ref", params.edit_ref);
  if (params.ot_group) search.set("ot_group", params.ot_group);
  if (params.ot_basis) search.set("ot_basis", params.ot_basis);
  if (params.ot_period) search.set("ot_period", params.ot_period);
  if (params.ot_start) search.set("ot_start", params.ot_start);
  if (params.ot_end) search.set("ot_end", params.ot_end);
  if (params.ot_custom) search.set("ot_custom", params.ot_custom);
  if (params.ot_company) search.set("ot_company", params.ot_company);
  if (params.ot_department) search.set("ot_department", params.ot_department);
  if (params.ot_employee) search.set("ot_employee", params.ot_employee);
  redirect(`/hr?${search.toString()}`);
}

export async function checkRequestAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const pendingTab = payrollOfficerPendingTab(session);
  const refId = String(formData.get("ref_id") ?? "").trim();
  const approvedOtHours = readOtHoursFromFormData(
    formData,
    "approved_ot_hours",
    "approved_ot_minutes",
  );

  if (!refId) {
    hrRedirect({ tab: pendingTab, error: "Invalid request reference." });
  }

  const request = await getRequestByRefId(refId);
  if (!request) {
    hrRedirect({ tab: pendingTab, error: "Request not found." });
  }

  const employee = await getEmployeeByPlacement(
    request.company ?? "",
    request.department ?? "",
    request.employeeName,
  );

  if (!canHrCheckRequest(session, isDirectHrConfiOwnSlip(request) ? "Confi" : employee?.employeeType)) {
    hrRedirect({
      tab: pendingTab,
      error: "You can only check Confi slips from this account.",
    });
  }

  const requiresHours = needsCheckHoursOnHrCheck(request.requestType);

  let checkedOtHrs: string | null = null;

  if (requiresHours) {
    if (approvedOtHours.empty) {
      hrRedirect({
        tab: pendingTab,
        error: "Number of hours approved is required before checking this request.",
      });
    }

    if (!approvedOtHours.valid || approvedOtHours.totalHours <= 0) {
      hrRedirect({
        tab: pendingTab,
        error: approvedOtHours.error ?? "Enter a valid number of approved hours greater than zero.",
      });
    }

    checkedOtHrs = approvedOtHours.storedValue;
  }

  const archived = await archiveRequest(refId, session.fullName, checkedOtHrs);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");
  revalidatePath("/employee");

  if (!archived) {
    hrRedirect({ tab: pendingTab, error: "Request could not be marked as checked." });
  }

  const successMessage = checkedOtHrs
    ? `Request ${refId} marked as checked with ${formatOtHoursLabel(parseOtHours(checkedOtHrs).hours)} approved.`
    : `Request ${refId} marked as checked.`;

  hrRedirect({ tab: pendingTab, success: successMessage });
}

export async function confirmPayrollCutoffAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  if (session.role !== "Payroll Officer") {
    hrRedirect({ tab: "rf", error: "Only payroll officers can confirm R&F cutoffs." });
  }

  const periodId = String(formData.get("period_id") ?? "").trim();
  const parsedPeriod = parseCutoffPeriodId(periodId);
  if (!parsedPeriod) {
    hrRedirect({ tab: "rf", error: "Invalid cutoff period." });
  }

  const [archived, roster] = await Promise.all([getArchivedRequests(), listEmployees(true)]);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const matching = filterPayrollOfficerRfRequests(
    archived,
    employeeTypeLookup,
    parsedPeriod.startDate,
    parsedPeriod.endDate,
  );

  if (matching.length === 0) {
    hrRedirect({
      tab: "rf",
      period: periodId,
      error: "No unconfirmed R&F records found for this cutoff.",
    });
  }

  try {
    const confirmed = await confirmPayrollPeriodRequests(
      matching.map((request) => request.refId),
      periodId,
      session.fullName,
    );

    revalidatePath("/hr");
    revalidatePath("/api/export/csv");

    if (confirmed === 0) {
      hrRedirect({
        tab: "rf",
        period: periodId,
        error: "Records could not be confirmed. They may have already been flagged.",
      });
    }

    hrRedirect({
      tab: "rf",
      period: periodId,
      success: `Payroll confirmed ${confirmed} R&F record(s) for this cutoff.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "rf",
      period: periodId,
      error: `Unable to confirm cutoff. ${String(error)}`,
    });
  }
}

export async function hrReturnRequestAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const pendingTab = payrollOfficerPendingTab(session);
  const refId = String(formData.get("ref_id") ?? "").trim();
  const hrReturnReason = String(formData.get("hr_return_reason") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: pendingTab, error: "Invalid request reference." });
  }

  if (!hrReturnReason) {
    hrRedirect({ tab: pendingTab, error: "A return reason is required." });
  }

  const request = await getRequestByRefId(refId);
  if (!request) {
    hrRedirect({ tab: pendingTab, error: "Request not found." });
  }

  if (request.payrollConfirmedPeriodId) {
    hrRedirect({
      tab: pendingTab,
      error: "This record is already payroll-confirmed and cannot be returned.",
    });
  }

  const employee = await getEmployeeByPlacement(
    request.company ?? "",
    request.department ?? "",
    request.employeeName,
  );

  if (!canHrCheckRequest(session, isDirectHrConfiOwnSlip(request) ? "Confi" : employee?.employeeType)) {
    hrRedirect({
      tab: pendingTab,
      error: "You can only return Confi slips from this account.",
    });
  }

  const returned = await hrReturnApprovedToManager(refId, session.fullName, hrReturnReason);
  revalidatePath("/hr");
  revalidatePath("/manager");
  revalidatePath("/verification");
  revalidatePath("/api/export/csv");

  if (!returned) {
    hrRedirect({ tab: pendingTab, error: "Request could not be returned to manager." });
  }

  hrRedirect({ tab: pendingTab, success: `Request ${refId} returned to manager.` });
}

export async function saveHrSlipAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const returnTab = String(formData.get("return_tab") ?? "").trim() || payrollOfficerPendingTab(session);
  const returnPeriod = String(formData.get("return_period") ?? "").trim();
  const refId = String(formData.get("ref_id") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const dateRequested = String(formData.get("date_requested") ?? "").trim();
  const dateOfIncident = String(formData.get("date_of_incident") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const otHours = readOtHoursFromFormData(formData, "ot_hours", "ot_minutes");
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  const redirectParams = {
    tab: returnTab,
    ...(returnPeriod ? { period: returnPeriod } : {}),
    ...(refId ? { edit_ref: refId } : {}),
  };

  if (!refId) {
    hrRedirect({ ...redirectParams, error: "Invalid request reference." });
  }

  const request = await getRequestByRefId(refId);
  if (!request) {
    hrRedirect({ tab: returnTab, period: returnPeriod || undefined, error: "Request not found." });
  }

  const roster = await listEmployees(true);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);

  if (!canHrEditRequest(request, session, employeeTypeLookup)) {
    hrRedirect({
      tab: returnTab,
      period: returnPeriod || undefined,
      error: "This record cannot be edited.",
    });
  }

  const employee = await getEmployeeByPlacement(
    request.company ?? "",
    request.department ?? "",
    request.employeeName,
  );
  if (!employee) {
    hrRedirect({
      ...redirectParams,
      error: "Employee not found on roster.",
    });
  }

  if (!requestType || !dateOfIncident || !reason) {
    hrRedirect({
      ...redirectParams,
      error: "Request type, incident date, and reason are required.",
    });
  }

  if (!(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    hrRedirect({ ...redirectParams, error: "Invalid request type." });
  }

  const allowedRequestTypes = employeePortalRequestTypes(employee.employeeType);
  if (!allowedRequestTypes.includes(requestType)) {
    hrRedirect({
      ...redirectParams,
      error: "This request type is not available for this employee.",
    });
  }

  const otFeatureError = validateEmployeePortalOtFeatures(
    employee.employeeType,
    requestType,
    fileAsOtOffset,
  );
  if (otFeatureError) {
    hrRedirect({ ...redirectParams, error: otFeatureError });
  }

  if (!otHours.valid) {
    hrRedirect({
      ...redirectParams,
      error: otHours.error ?? "Invalid OT hours.",
    });
  }

  if (fileAsOtOffset && !reason.startsWith("[OT offset credit]")) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const updated = await adminUpdateRequest(
      refId,
      {
        company: request.company ?? "",
        department: request.department ?? "",
        employeeName: request.employeeName,
        requestType,
        dateRequested,
        dateOfIncident,
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        otHrs: otHours.storedValue || null,
        reason,
        verificationNote: request.verificationNote,
      },
      session.fullName,
    );

    if (!updated) {
      hrRedirect({
        tab: returnTab,
        period: returnPeriod || undefined,
        error: "Request could not be updated.",
      });
    }

    revalidatePath("/hr");
    revalidatePath("/employee");
    revalidatePath("/manager");
    revalidatePath("/verification");
    revalidatePath("/api/export/csv");
    revalidatePath("/api/export/ot-summary");

    hrRedirect({
      tab: returnTab,
      period: returnPeriod || undefined,
      success: `Request ${refId} updated successfully.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      ...redirectParams,
      error: `Unable to update request. ${String(error)}`,
    });
  }
}

export async function archiveRequestAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const pendingTab = payrollOfficerPendingTab(session);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: pendingTab, error: "Invalid request reference." });
  }

  const archived = await archiveRequest(refId, session.fullName);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!archived) {
    hrRedirect({ tab: pendingTab, error: "Request could not be archived." });
  }

  hrRedirect({ tab: pendingTab, success: `Request ${refId} archived.` });
}

export async function unarchiveRequestAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const checkedTab = payrollOfficerCheckedTab(session);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: checkedTab, error: "Invalid request reference." });
  }

  const restored = await unarchiveRequest(refId);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!restored) {
    hrRedirect({ tab: checkedTab, error: "Request could not be restored." });
  }

  hrRedirect({ tab: checkedTab, success: `Request ${refId} restored to pending.` });
}

export async function saveEmployeeRosterAction(formData: FormData) {
  await requireHrPortalAccess();
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const biometricParsed = parseOptionalBiometricNo(String(formData.get("biometric_no") ?? ""));

  if (!fullName || !departmentId || !employeeType) {
    hrRedirect({ tab: "employees", error: "Employee name, department, and type are required." });
  }

  if (biometricParsed.error) {
    hrRedirect({ tab: "employees", error: biometricParsed.error });
  }

  if (emailRaw && !isValidEmail(emailRaw)) {
    hrRedirect({ tab: "employees", error: "Please enter a valid email address." });
  }

  if (!(EMPLOYEE_TYPES as readonly string[]).includes(employeeType)) {
    hrRedirect({ tab: "employees", error: "Invalid employee type." });
  }

  const departments = await listDepartments(true);
  const department = departments.find((row) => row.id === departmentId);
  if (!department) {
    hrRedirect({ tab: "employees", error: "Selected department is not available." });
  }

  if (biometricParsed.value != null && (await isBiometricNoTaken(biometricParsed.value, id > 0 ? id : undefined))) {
    hrRedirect({
      tab: "employees",
      error: `Biometric number ${biometricParsed.value} is already assigned to another employee.`,
    });
  }

  try {
    if (id > 0) {
      const updated = await updateEmployee(id, {
        fullName,
        departmentId,
        employeeType,
        email,
        biometricNo: biometricParsed.value,
        isActive,
      });
      if (!updated) {
        hrRedirect({ tab: "employees", error: "Employee not found." });
      }
      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/employee");
      hrRedirect({ tab: "employees", success: `Updated employee ${fullName}.` });
    }

    await createEmployee({
      fullName,
      departmentId,
      employeeType,
      email,
      biometricNo: biometricParsed.value,
    });
    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/employee");
    hrRedirect({ tab: "employees", success: `Added employee ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "employees",
      error: `Unable to save employee. ${String(error)}`,
    });
  }
}

export async function saveManagerAction(formData: FormData) {
  await requireHrPortalAccess();
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const company = String(formData.get("company") ?? "").trim();
  const department = normalizeManagerDepartment(String(formData.get("department") ?? "").trim()) ?? "";
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username || !company) {
    hrRedirect({ tab: "managers", error: "Name, username, and company are required." });
  }

  if (!(await isActiveCompany(company))) {
    hrRedirect({ tab: "managers", error: "Invalid or inactive company." });
  }

  const managerConflict = await findPortalRoleConflict(
    fullName,
    company,
    "Manager",
    id > 0 ? id : undefined,
  );
  if (managerConflict) {
    hrRedirect({
      tab: "managers",
      error: `${fullName} already has a verifier account for ${company}.`,
    });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing || existing.role !== "Manager") {
        hrRedirect({ tab: "managers", error: "Manager account not found." });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          hrRedirect({ tab: "managers", error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        fullName,
        username,
        company,
        department: department || null,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/verification");
      hrRedirect({ tab: "managers", success: `Updated manager ${fullName}.` });
    }

    if (!password) {
      hrRedirect({ tab: "managers", error: "Password is required for new manager accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      hrRedirect({ tab: "managers", error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role: "Manager",
      company,
      department: department || null,
    });

    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/verification");
    hrRedirect({ tab: "managers", success: `Created manager account for ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "managers",
      error: `Unable to save manager. ${String(error)}`,
    });
  }
}

export async function saveVerifierAction(formData: FormData) {
  await requireHrPortalAccess();
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username || !company) {
    hrRedirect({ tab: "verifiers", error: "Name, username, and company are required." });
  }

  if (!(await isActiveCompany(company))) {
    hrRedirect({ tab: "verifiers", error: "Invalid or inactive company." });
  }

  const verifierConflict = await findPortalRoleConflict(
    fullName,
    company,
    "Verifier",
    id > 0 ? id : undefined,
  );
  if (verifierConflict) {
    hrRedirect({
      tab: "verifiers",
      error: `${fullName} already has a manager account for ${company}.`,
    });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing || existing.role !== "Verifier") {
        hrRedirect({ tab: "verifiers", error: "Verifier account not found." });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          hrRedirect({ tab: "verifiers", error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        fullName,
        username,
        company,
        department,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/verification");
      hrRedirect({ tab: "verifiers", success: `Updated verifier ${fullName}.` });
    }

    if (!password) {
      hrRedirect({ tab: "verifiers", error: "Password is required for new verifier accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      hrRedirect({ tab: "verifiers", error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role: "Verifier",
      company,
      department,
    });

    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/verification");
    hrRedirect({ tab: "verifiers", success: `Created verifier account for ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "verifiers",
      error: `Unable to save verifier. ${String(error)}`,
    });
  }
}

export async function savePayrollCutoffRulesAction(formData: FormData) {
  await requireHrPortalAccess();
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const cutoffDay1 = Number(formData.get("cutoff_day_1"));
  const cutoffDay2 = Number(formData.get("cutoff_day_2"));

  if (!employeeType) {
    hrRedirect({ tab: "ot-summary", settings: true, error: "Employee type is required." });
  }

  const validationError = validateCutoffDays(cutoffDay1, cutoffDay2);
  if (validationError) {
    hrRedirect({ tab: "ot-summary", settings: true, error: validationError });
  }

  const updated = await updatePayrollCutoffRule(employeeType, cutoffDay1, cutoffDay2);
  revalidatePath("/hr");

  if (!updated) {
    hrRedirect({ tab: "ot-summary", settings: true, error: "Cutoff rule not found." });
  }

  hrRedirect({
    tab: "ot-summary",
    settings: true,
    success: `Updated ${employeeType} cutoff days to ${cutoffDay1} and ${cutoffDay2}.`,
  });
}

export async function saveOtEligibleTypesAction(formData: FormData) {
  await requireHrPortalAccess();
  const activeTypes = formData.getAll("eligible_types").map((value) => String(value));

  await saveOtEligibleTypes(activeTypes);
  revalidatePath("/hr");
  hrRedirect({ tab: "ot-summary", settings: true, success: "Updated OT-eligible request types." });
}

function buildOtSummaryRedirectParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = { tab: "ot-summary" };
  const keys = [
    "ot_group",
    "ot_basis",
    "ot_period",
    "ot_start",
    "ot_end",
    "ot_custom",
    "ot_company",
    "ot_department",
    "ot_employee",
  ] as const;

  for (const key of keys) {
    const value = String(formData.get(key) ?? "").trim();
    if (value) params[key] = value;
  }

  return params;
}

export async function saveOtManualOverrideAction(formData: FormData) {
  const session = await requireHrPortalAccess();
  const redirectParams = buildOtSummaryRedirectParams(formData);

  const payrollGroup = String(formData.get("ot_group") ?? "").trim();
  const exportBasis = String(formData.get("ot_basis") ?? "").trim();
  const company = String(formData.get("ot_company") ?? "").trim();
  const department = String(formData.get("ot_department") ?? "").trim();
  const employeeName = String(formData.get("ot_employee") ?? "").trim();
  const overrideHours = readOtHoursFromFormData(formData, "override_hours", "override_minutes", {
    required: true,
  });
  const note = String(formData.get("note") ?? "").trim();
  const useCustomRange = String(formData.get("ot_custom") ?? "") === "1";

  let periodStart = String(formData.get("ot_start") ?? "").trim();
  let periodEnd = String(formData.get("ot_end") ?? "").trim();

  if (!useCustomRange) {
    const periodId = String(formData.get("ot_period") ?? "").trim();
    const { parseCutoffPeriodId } = await import("@/lib/cutoff");
    const parsed = parseCutoffPeriodId(periodId);
    if (!parsed) {
      hrRedirect({ ...redirectParams, error: "Select a valid cutoff period before saving an override." });
    }
    periodStart = parsed.startDate;
    periodEnd = parsed.endDate;
  }

  if (payrollGroup !== "Confi") {
    hrRedirect({ ...redirectParams, error: "Manual overrides are available for Confi only." });
  }

  if (exportBasis !== "checked") {
    hrRedirect({
      ...redirectParams,
      error: "Switch export basis to HR-checked (official) before saving a manual override.",
    });
  }

  if (!company || !department || !employeeName) {
    hrRedirect({
      ...redirectParams,
      error: "Select company, department, and employee before saving a manual override.",
    });
  }

  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    hrRedirect({ ...redirectParams, error: "A valid cutoff period is required." });
  }

  if (!overrideHours.valid || overrideHours.totalHours <= 0) {
    hrRedirect({
      ...redirectParams,
      error: overrideHours.error ?? "Enter a valid number of hours greater than zero.",
    });
  }

  if (!note) {
    hrRedirect({ ...redirectParams, error: "Remarks / notes are required." });
  }

  const { verifyEmployeePlacement, listEmployees } = await import("@/lib/roster");
  const validEmployee = await verifyEmployeePlacement(company, department, employeeName);
  if (!validEmployee) {
    hrRedirect({ ...redirectParams, error: "Selected employee does not match the chosen company and department." });
  }

  const roster = await listEmployees(true);
  const employee = roster.find(
    (row) =>
      row.companyName === company &&
      row.departmentName === department &&
      row.fullName === employeeName,
  );
  if (!employee || employee.employeeType !== "Confi") {
    hrRedirect({ ...redirectParams, error: "Manual overrides are limited to Confi employees on the roster." });
  }

  try {
    const { addOtManualOverrideHours } = await import("@/lib/ot-overrides");
    await addOtManualOverrideHours({
      company,
      department,
      employeeName,
      payrollGroup: "Confi",
      periodStart,
      periodEnd,
      hoursToAdd: overrideHours.totalHours,
      note,
      savedBy: session.fullName,
    });

    revalidatePath("/hr");
    revalidatePath("/api/export/ot-summary");
    hrRedirect({
      ...redirectParams,
      success: `Added ${formatOtHoursLabel(overrideHours.totalHours)} manual OT for ${employeeName}.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      ...redirectParams,
      error: `Unable to save manual override. ${String(error)}`,
    });
  }
}

export async function saveHrCompanyAction(formData: FormData) {
  await requireHrPortalAccess();
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!name) {
    hrRedirect({ tab: "companies", error: "Company name is required." });
  }

  try {
    if (id > 0) {
      const updated = await updateCompany(id, { name, isActive });
      if (!updated) {
        hrRedirect({ tab: "companies", error: "Company not found." });
      }
      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/employee");
      hrRedirect({ tab: "companies", success: `Updated company ${name}.` });
    }

    await createCompany(name);
    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/employee");
    hrRedirect({ tab: "companies", success: `Added company ${name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "companies",
      error: `Unable to save company. ${String(error)}`,
    });
  }
}
