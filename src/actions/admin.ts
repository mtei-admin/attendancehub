"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles, isNextNavigationError } from "@/lib/action-auth";
import { EMPLOYEE_TYPES, HR_SCOPES, REQUEST_TYPES, normalizeManagerDepartment } from "@/lib/constants";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createCompany, isActiveCompany, updateCompany } from "@/lib/companies";
import { createDepartment, updateDepartment } from "@/lib/departments";
import { createEmployee, updateEmployee, isBiometricNoTaken } from "@/lib/roster";
import { parseOptionalBiometricNo } from "@/lib/biometric";
import { createUser, deactivateUser, getUserById, getUserByUsername, findPortalRoleConflict, updateUser } from "@/lib/users";
import { readOtHoursFromFormData } from "@/lib/ot-hours";
import { adminUpdateRequest } from "@/lib/requests";
import { verifyEmployeePlacement } from "@/lib/roster";

function adminRedirect(params: {
  tab?: string;
  success?: string;
  error?: string;
  edit_ref?: string;
}): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.edit_ref) search.set("edit_ref", params.edit_ref);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/admin?${search.toString()}`);
}

export async function saveDepartmentAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const company = String(formData.get("company") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!company || !name) {
    adminRedirect({ tab: "departments", error: "Company and department name are required." });
  }

  if (!(await isActiveCompany(company))) {
    adminRedirect({ tab: "departments", error: "Invalid or inactive company." });
  }

  try {
    if (id > 0) {
      const updated = await updateDepartment(id, { company, name, isActive });
      if (!updated) {
        adminRedirect({ tab: "departments", error: "Department not found." });
      }
      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/employee");
      adminRedirect({ tab: "departments", success: `Updated ${company} · ${name}.` });
    }

    await createDepartment({ company, name });
    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "departments", success: `Added ${company} · ${name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "departments",
      error: `Unable to save department. ${String(error)}`,
    });
  }
}

export async function saveAdminEmployeeAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const biometricParsed = parseOptionalBiometricNo(String(formData.get("biometric_no") ?? ""));

  if (!fullName || !departmentId || !employeeType) {
    adminRedirect({ tab: "employees", error: "Employee name, department, and type are required." });
  }

  if (biometricParsed.error) {
    adminRedirect({ tab: "employees", error: biometricParsed.error });
  }

  if (emailRaw && !isValidEmail(emailRaw)) {
    adminRedirect({ tab: "employees", error: "Please enter a valid email address." });
  }

  if (!(EMPLOYEE_TYPES as readonly string[]).includes(employeeType)) {
    adminRedirect({ tab: "employees", error: "Invalid employee type." });
  }

  if (biometricParsed.value != null && (await isBiometricNoTaken(biometricParsed.value, id > 0 ? id : undefined))) {
    adminRedirect({
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
        adminRedirect({ tab: "employees", error: "Employee not found." });
      }
      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/employee");
      adminRedirect({ tab: "employees", success: `Updated employee ${fullName}.` });
    }

    await createEmployee({
      fullName,
      departmentId,
      employeeType,
      email,
      biometricNo: biometricParsed.value,
    });
    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "employees", success: `Added employee ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "employees",
      error: `Unable to save employee. ${String(error)}`,
    });
  }
}

export async function deleteAdminEmployeeAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);

  if (!id) {
    adminRedirect({ tab: "employees", error: "Employee not found." });
  }

  try {
    const updated = await updateEmployee(id, { isActive: false });
    if (!updated) {
      adminRedirect({ tab: "employees", error: "Employee not found." });
    }

    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "employees", success: `Removed ${updated.fullName} from the roster.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "employees",
      error: `Unable to remove employee. ${String(error)}`,
    });
  }
}

export async function saveAdminVerifierAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "Verifier", "verifiers");
}

export async function saveAdminManagerAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "Manager", "managers");
}

export async function saveAdminHrAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "HR", "hr");
}

export async function saveAdminPayrollOfficerAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "Payroll Officer", "hr");
}

export async function saveAdminSlipAction(formData: FormData) {
  const session = await requireRoles(["Admin"]);
  const refId = String(formData.get("ref_id") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const dateRequested = String(formData.get("date_requested") ?? "").trim();
  const dateOfIncident = String(formData.get("date_of_incident") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const verificationNote = String(formData.get("verification_note") ?? "").trim();
  const otHours = readOtHoursFromFormData(formData, "ot_hours", "ot_minutes");
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!refId) {
    adminRedirect({ tab: "slips", error: "Invalid request reference." });
  }

  if (!company || !department || !employeeName || !requestType || !dateOfIncident || !reason) {
    adminRedirect({
      tab: "slips",
      edit_ref: refId,
      error: "Company, department, employee, request type, incident date, and reason are required.",
    });
  }

  if (!(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    adminRedirect({ tab: "slips", edit_ref: refId, error: "Invalid request type." });
  }

  if (!otHours.valid) {
    adminRedirect({
      tab: "slips",
      edit_ref: refId,
      error: otHours.error ?? "Invalid OT hours.",
    });
  }

  const validEmployee = await verifyEmployeePlacement(company, department, employeeName);
  if (!validEmployee) {
    adminRedirect({
      tab: "slips",
      edit_ref: refId,
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  if (fileAsOtOffset && !reason.startsWith("[OT offset credit]")) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const updated = await adminUpdateRequest(
      refId,
      {
        company,
        department,
        employeeName,
        requestType,
        dateRequested,
        dateOfIncident,
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        otHrs: otHours.storedValue || null,
        reason,
        verificationNote: verificationNote || null,
      },
      session.fullName,
    );

    if (!updated) {
      adminRedirect({ tab: "slips", error: "Request not found or could not be updated." });
    }

    revalidatePath("/admin");
    revalidatePath("/employee");
    revalidatePath("/manager");
    revalidatePath("/verification");
    revalidatePath("/hr");
    revalidatePath("/api/export/csv");
    revalidatePath("/api/export/ot-summary");

    adminRedirect({ tab: "slips", success: `Request ${refId} updated successfully.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "slips",
      edit_ref: refId,
      error: `Unable to update request. ${String(error)}`,
    });
  }
}

export async function deleteAdminUserAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const tab = String(formData.get("tab") ?? "managers").trim();

  if (!id) {
    adminRedirect({ tab, error: "Account not found." });
  }

  try {
    const existing = await getUserById(id);
    if (!existing) {
      adminRedirect({ tab, error: "Account not found." });
    }

    const updated = await deactivateUser(id);
    if (!updated) {
      adminRedirect({ tab, error: "Account not found." });
    }

    revalidatePath("/admin");
    revalidatePath("/hr");
    adminRedirect({ tab, success: `Removed ${updated.fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab,
      error: `Unable to remove account. ${String(error)}`,
    });
  }
}

export async function saveCompanyAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!name) {
    adminRedirect({ tab: "companies", error: "Company name is required." });
  }

  try {
    if (id > 0) {
      const updated = await updateCompany(id, { name, isActive });
      if (!updated) {
        adminRedirect({ tab: "companies", error: "Company not found." });
      }
      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/employee");
      adminRedirect({ tab: "companies", success: `Updated company ${name}.` });
    }

    await createCompany(name);
    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "companies", success: `Added company ${name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "companies",
      error: `Unable to save company. ${String(error)}`,
    });
  }
}

export async function deleteAdminCompanyAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);

  if (!id) {
    adminRedirect({ tab: "companies", error: "Company not found." });
  }

  try {
    const updated = await updateCompany(id, { isActive: false });
    if (!updated) {
      adminRedirect({ tab: "companies", error: "Company not found." });
    }

    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "companies", success: `Removed company ${updated.name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "companies",
      error: `Unable to remove company. ${String(error)}`,
    });
  }
}

export async function deleteAdminDepartmentAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);

  if (!id) {
    adminRedirect({ tab: "departments", error: "Department not found." });
  }

  try {
    const updated = await updateDepartment(id, { isActive: false });
    if (!updated) {
      adminRedirect({ tab: "departments", error: "Department not found." });
    }

    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "departments", success: `Removed department ${updated.name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "departments",
      error: `Unable to remove department. ${String(error)}`,
    });
  }
}

export async function saveCredentialsAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim() || null;
  const department = normalizeManagerDepartment(String(formData.get("department") ?? "").trim() || null);
  const hrScope = String(formData.get("hr_scope") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!username || !fullName || !role) {
    adminRedirect({ tab: "credentials", error: "Name, username, and role are required." });
  }

  if (role === "Manager" && !company) {
    adminRedirect({ tab: "credentials", error: "Company is required for managers." });
  }

  if (role === "Verifier" && !company) {
    adminRedirect({ tab: "credentials", error: "Company is required for verifiers." });
  }

  if ((role === "Manager" || role === "Verifier") && company && !(await isActiveCompany(company))) {
    adminRedirect({ tab: "credentials", error: "Invalid or inactive company." });
  }

  if (role === "Manager" && company) {
    const conflict = await findPortalRoleConflict(fullName, company, "Manager", id > 0 ? id : undefined);
    if (conflict) {
      adminRedirect({
        tab: "credentials",
        error: `${fullName} already has a verifier account for ${company}.`,
      });
    }
  }

  if (role === "Verifier" && company) {
    const conflict = await findPortalRoleConflict(fullName, company, "Verifier", id > 0 ? id : undefined);
    if (conflict) {
      adminRedirect({
        tab: "credentials",
        error: `${fullName} already has a manager account for ${company}.`,
      });
    }
  }

  if (role === "HR" && hrScope && !(HR_SCOPES as readonly string[]).includes(hrScope)) {
    adminRedirect({ tab: "credentials", error: "Invalid HR scope." });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing) {
        adminRedirect({ tab: "credentials", error: "Account not found." });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          adminRedirect({ tab: "credentials", error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        username,
        fullName,
        role,
        company: role === "Manager" || role === "Verifier" ? company : null,
        department: role === "Manager" ? department : role === "Verifier" ? department : null,
        hrScope: role === "HR" ? hrScope : null,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/verification");
      adminRedirect({ tab: "credentials", success: `Updated credentials for ${fullName}.` });
    }

    if (!password) {
      adminRedirect({ tab: "credentials", error: "Password is required for new accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      adminRedirect({ tab: "credentials", error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role,
      company: role === "Manager" || role === "Verifier" ? company : null,
      department: role === "Manager" ? department : role === "Verifier" ? department : null,
      hrScope: role === "HR" ? hrScope : null,
    });

    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/verification");
    adminRedirect({ tab: "credentials", success: `Created account for ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab: "credentials",
      error: `Unable to save account. ${String(error)}`,
    });
  }
}

async function savePortalUserAction(
  formData: FormData,
  role: "Manager" | "HR" | "Verifier" | "Payroll Officer",
  tab: "managers" | "hr" | "verifiers",
) {
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const company = String(formData.get("company") ?? "").trim() || null;
  const department = normalizeManagerDepartment(String(formData.get("department") ?? "").trim() || null);
  const hrScope = String(formData.get("hr_scope") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username) {
    adminRedirect({ tab, error: "Name and username are required." });
  }

  if (role === "Manager" && !company) {
    adminRedirect({ tab, error: "Company is required for managers." });
  }

  if (role === "Verifier" && !company) {
    adminRedirect({ tab, error: "Company is required for verifiers." });
  }

  if ((role === "Manager" || role === "Verifier") && company && !(await isActiveCompany(company))) {
    adminRedirect({ tab, error: "Invalid or inactive company." });
  }

  if (role === "Manager" && company) {
    const conflict = await findPortalRoleConflict(fullName, company, "Manager", id > 0 ? id : undefined);
    if (conflict) {
      adminRedirect({
        tab,
        error: `${fullName} already has a verifier account for ${company}.`,
      });
    }
  }

  if (role === "Verifier" && company) {
    const conflict = await findPortalRoleConflict(fullName, company, "Verifier", id > 0 ? id : undefined);
    if (conflict) {
      adminRedirect({
        tab,
        error: `${fullName} already has a manager account for ${company}.`,
      });
    }
  }

  if (role === "HR" && hrScope && !(HR_SCOPES as readonly string[]).includes(hrScope)) {
    adminRedirect({ tab, error: "Invalid HR scope." });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing || existing.role !== role) {
        adminRedirect({ tab, error: `${role} account not found.` });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          adminRedirect({ tab, error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        fullName,
        username,
        company: role === "Manager" || role === "Verifier" ? company : null,
        department:
          role === "Manager" ? department : role === "Verifier" ? department : null,
        hrScope: role === "HR" ? hrScope : null,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/verification");
      adminRedirect({ tab, success: `Updated ${role.toLowerCase()} account for ${fullName}.` });
    }

    if (!password) {
      adminRedirect({ tab, error: "Password is required for new accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      adminRedirect({ tab, error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role,
      company: role === "Manager" || role === "Verifier" ? company : null,
      department: role === "Manager" ? department : role === "Verifier" ? department : null,
      hrScope: role === "HR" ? hrScope : null,
    });

    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/verification");
    adminRedirect({ tab, success: `Created ${role.toLowerCase()} account for ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    adminRedirect({
      tab,
      error: `Unable to save account. ${String(error)}`,
    });
  }
}
