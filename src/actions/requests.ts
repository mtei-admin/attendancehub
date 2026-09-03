"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { isNextNavigationError } from "@/lib/action-auth";
import { getSession } from "@/lib/auth";
import { notifyManagersOfNewSlip } from "@/lib/basecamp";
import { ROLE_ROUTES, type Role } from "@/lib/constants";
import { readOtHoursFromFormData } from "@/lib/ot-hours";
import {
  computeAvailableOtOffsetBalance,
  computeHoursFromTimeRange,
  computeOtOffsetHoursFromTimeRange,
  formatInsufficientOtOffsetBalanceMessage,
  OT_OFFSET_REQUEST_TYPE,
} from "@/lib/ot-offset-balance";
import { getActiveOtEligibleTypes, getPayrollCutoffRule } from "@/lib/ot-settings";
import { getEarliestAllowedIncidentDate } from "@/lib/cutoff";
import {
  applyEmployeePortalTimeDefaults,
  employeePortalRequestTypes,
  isConfiEmployee,
  isOtOrHolidayWorkRequestType,
  validateEmployeePortalOtFeatures,
  validateEmployeePortalTimeFields,
} from "@/lib/employee-portal";
import { shouldDirectHrConfiOwnSlipOnSubmit } from "@/lib/direct-hr-confi-slips";
import { managerCanApproveEmployee, isEmployeeOnlyManager, getManagerAllowedEmployeeNames } from "@/lib/manager-approval-scope";
import {
  preApprovedOtFilingError,
} from "@/lib/pre-approved-ot";
import { getEmployeeByPlacement, verifyEmployeePlacement } from "@/lib/roster";
import {
  addManagerOwnRequest,
  addRequest,
  findDuplicateSlip,
  getRequestByRefId,
  preApproveOtRequest,
  updateRequestStatus,
} from "@/lib/requests";

function revalidateRolePaths() {
  for (const path of Object.values(ROLE_ROUTES)) {
    revalidatePath(path);
  }
}

export async function submitRequestAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "");
  const dateRequested = String(formData.get("date_requested") ?? "");
  const dateOfIncident = String(formData.get("date_of_incident") ?? "");
  const rawTimeIn = String(formData.get("time_in") ?? "").trim();
  const rawTimeOut = String(formData.get("time_out") ?? "").trim();
  const otHours = readOtHoursFromFormData(formData, "ot_hours", "ot_minutes");
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  const isPreApprovedOt = formData.get("is_pre_approved_ot") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!company || !department || !employeeName) {
    redirect("/employee?error=Please select company, department, and employee.");
  }

  if (!reason) {
    redirect("/employee?error=Please provide a reason before submitting.");
  }

  const validEmployee = await verifyEmployeePlacement(company, department, employeeName);
  if (!validEmployee) {
    redirect("/employee?error=Selected employee does not match the chosen company and department.");
  }

  const employee = await getEmployeeByPlacement(company, department, employeeName);
  if (!employee) {
    redirect("/employee?error=Employee not found on roster.");
  }

  const allowedRequestTypes = employeePortalRequestTypes(employee.employeeType);
  if (!allowedRequestTypes.includes(requestType)) {
    redirect("/employee?error=This request type is not available for the selected employee.");
  }

  if (!dateOfIncident || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfIncident)) {
    redirect("/employee?error=Please select a valid date of application.");
  }

  const cutoffRule = await getPayrollCutoffRule(employee.employeeType);
  const earliestIncidentDate = getEarliestAllowedIncidentDate(cutoffRule);
  if (earliestIncidentDate && dateOfIncident < earliestIncidentDate) {
    redirect(
      `/employee?error=${encodeURIComponent(
        `Date of application must be on or after ${earliestIncidentDate} (current cutoff period). Earlier cutoffs cannot be filed.`,
      )}`,
    );
  }

  const otFeatureError = validateEmployeePortalOtFeatures(
    employee.employeeType,
    requestType,
    fileAsOtOffset,
  );
  if (otFeatureError) {
    redirect(`/employee?error=${encodeURIComponent(otFeatureError)}`);
  }

  const { timeIn, timeOut } = applyEmployeePortalTimeDefaults(requestType, rawTimeIn, rawTimeOut);
  const timeFieldError = validateEmployeePortalTimeFields(requestType, timeIn, timeOut);
  if (timeFieldError) {
    redirect(`/employee?error=${encodeURIComponent(timeFieldError)}`);
  }

  const timeRange =
    requestType === OT_OFFSET_REQUEST_TYPE
      ? computeOtOffsetHoursFromTimeRange(timeIn, timeOut)
      : computeHoursFromTimeRange(timeIn, timeOut);
  if (!timeRange.valid) {
    redirect(`/employee?error=${encodeURIComponent(timeRange.error ?? "Invalid From/To times.")}`);
  }

  let otStoredValue = otHours.storedValue || null;

  if (requestType === OT_OFFSET_REQUEST_TYPE) {
    if (!isConfiEmployee(employee.employeeType)) {
      redirect("/employee?error=OT%20Offset%20is%20only%20available%20for%20Confi%20employees.");
    }

    if (timeRange.empty || timeRange.totalHours <= 0) {
      redirect("/employee?error=Enter%20valid%20From%20and%20To%20times%20for%20OT%20Offset.");
    }

    const otEligibleTypes = await getActiveOtEligibleTypes();
    const availableBalance = await computeAvailableOtOffsetBalance(
      { company, department, employeeName },
      otEligibleTypes,
    );

    if (timeRange.totalHours > availableBalance) {
      redirect(
        `/employee?error=${encodeURIComponent(
          formatInsufficientOtOffsetBalanceMessage(availableBalance, timeRange.totalHours),
        )}`,
      );
    }

    otStoredValue = timeRange.storedValue;
  } else if (isOtOrHolidayWorkRequestType(requestType)) {
    if (timeRange.empty || timeRange.totalHours <= 0) {
      redirect(
        "/employee?error=Enter%20valid%20From%20and%20To%20times%20to%20calculate%20hours%20to%20claim.",
      );
    }
    otStoredValue = timeRange.storedValue;
  } else if (!otHours.valid) {
    redirect(`/employee?error=${encodeURIComponent(otHours.error ?? "Invalid hours to claim.")}`);
  }

  if (fileAsOtOffset) {
    reason = `[OT offset credit] ${reason}`;
  }

  if (isPreApprovedOt) {
    const preApprovedError = preApprovedOtFilingError(requestType, dateOfIncident);
    if (preApprovedError) {
      redirect(`/employee?error=${encodeURIComponent(preApprovedError)}`);
    }
  }

  const directToHr = await shouldDirectHrConfiOwnSlipOnSubmit(employeeName, {
    company,
    department,
  });
  const storedEmployeeName = directToHr ? employee.fullName : employeeName;
  const duplicate = await findDuplicateSlip({
    company,
    department,
    employeeName: storedEmployeeName,
    requestType,
    dateOfIncident,
    timeIn: timeIn || null,
    timeOut: timeOut || null,
  });
  if (duplicate) {
    redirect(
      `/employee?error=${encodeURIComponent(
        `A slip with the same date, time, and request type already exists (${duplicate.refId}, ${duplicate.status}). Rejected slips can be refiled.`,
      )}`,
    );
  }

  try {
    // Pre-approved OT cannot use the direct-to-HR Confi shortcut.
    const useDirectHr = directToHr && !isPreApprovedOt;
    const refId = useDirectHr
      ? await addManagerOwnRequest({
          company,
          department,
          employeeName: employee.fullName,
          employeeId: employee.id,
          managerName: employee.fullName,
          requestType,
          dateRequested,
          dateOfIncident,
          reason,
          timeIn: timeIn || null,
          timeOut: timeOut || null,
          otHrs: otStoredValue,
        })
      : await addRequest({
          company,
          department,
          employeeName,
          employeeId: employee.id,
          requestType,
          dateRequested,
          dateOfIncident,
          reason,
          timeIn: timeIn || null,
          timeOut: timeOut || null,
          otHrs: otStoredValue,
          skipVerification: employee.skipVerification,
          isPreApprovedOt,
        });

    // Company Campfire only — not special scoped managers (e.g. Dominic).
    if (!useDirectHr) {
      after(() =>
        notifyManagersOfNewSlip({
          company,
          department,
          employeeName,
          requestType,
          dateOfIncident,
          refId,
          isPreApprovedOt,
        }),
      );
    }

    revalidateRolePaths();
    redirect(
      useDirectHr
        ? `/employee?success=Request ${refId} submitted and sent to HR Confi pending.`
        : isPreApprovedOt
          ? `/employee?success=Request ${refId} submitted for pre-approved OT (pending manager pre-approval).`
          : employee.skipVerification
            ? `/employee?success=Request ${refId} submitted successfully and is pending manager review.`
            : `/employee?success=Request ${refId} submitted successfully and is pending verification and manager review.`,
    );
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    redirect(
      `/employee?error=${encodeURIComponent(`Unable to submit your request. Please try again. (${String(error)})`)}`,
    );
  }
}

export async function updateStatusAction(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== "Manager" && session.role !== "Admin")) {
    redirect("/manager?error=You are not authorized to update requests.");
  }

  const refId = String(formData.get("ref_id") ?? "");
  const status = String(formData.get("status") ?? "") as "Approved" | "Rejected";
  const approvedOtHrs = String(formData.get("approved_ot_hrs") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!refId || (status !== "Approved" && status !== "Rejected")) {
    redirect("/manager?error=Invalid request.");
  }

  if (status === "Rejected" && !rejectionReason) {
    redirect("/manager?error=A rejection reason is required.");
  }

  const scope =
    session.role === "Manager"
      ? (() => {
          const allowedNames = getManagerAllowedEmployeeNames(session.fullName);
          if (isEmployeeOnlyManager(session.fullName) && allowedNames) {
            return {
              company: session.company ?? undefined,
              employeeNames: allowedNames,
            };
          }
          return {
            company: session.company ?? undefined,
            department: session.department ?? undefined,
          };
        })()
      : undefined;

  if (session.role === "Manager" && !session.company) {
    redirect("/manager?error=Your manager account has no company assigned.");
  }

  if (session.role === "Manager") {
    const existing = await getRequestByRefId(refId);
    if (!existing) {
      redirect("/manager?error=Request could not be updated. It may have already been processed.");
    }
    if (!managerCanApproveEmployee(session.fullName, existing.employeeName)) {
      redirect(
        "/manager?error=You are not authorized to approve or reject this employee%27s request.",
      );
    }
    if (existing.isPreApprovedOt && status === "Approved" && existing.completionOutcome !== "needs_reapproval") {
      redirect(
        "/manager?error=Use Pre-approve for new pre-approved OT, or wait for verifier re-approval.",
      );
    }
  }

  try {
    const updated = await updateRequestStatus(
      refId,
      status,
      session.fullName,
      scope,
      status === "Approved" && approvedOtHrs ? approvedOtHrs : null,
      status === "Rejected" ? rejectionReason : null,
    );
    if (!updated) {
      redirect(
        "/manager?error=Request could not be updated. It may have already been processed or is outside your department.",
      );
    }
    revalidateRolePaths();
    redirect(`/manager?success=Request ${refId} ${status.toLowerCase()}.`);
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    redirect(
      `/manager?error=${encodeURIComponent(`Unable to update request: ${String(error)}`)}`,
    );
  }
}

export async function preApproveOtAction(formData: FormData) {
  const session = await getSession();
  if (!session || (session.role !== "Manager" && session.role !== "Admin")) {
    redirect("/manager?error=You are not authorized to pre-approve OT.");
  }

  const refId = String(formData.get("ref_id") ?? "").trim();
  if (!refId) {
    redirect("/manager?error=Invalid request.");
  }

  const scope =
    session.role === "Manager"
      ? (() => {
          const allowedNames = getManagerAllowedEmployeeNames(session.fullName);
          if (isEmployeeOnlyManager(session.fullName) && allowedNames) {
            return {
              company: session.company ?? undefined,
              employeeNames: allowedNames,
            };
          }
          return {
            company: session.company ?? undefined,
            department: session.department ?? undefined,
          };
        })()
      : undefined;

  if (session.role === "Manager" && !session.company) {
    redirect("/manager?error=Your manager account has no company assigned.");
  }

  const existing = await getRequestByRefId(refId);
  if (!existing) {
    redirect("/manager?error=Request not found.");
  }
  if (session.role === "Manager" && !managerCanApproveEmployee(session.fullName, existing.employeeName)) {
    redirect("/manager?error=You are not authorized to pre-approve this employee%27s OT.");
  }

  try {
    const updated = await preApproveOtRequest(
      refId,
      { userId: session.userId, fullName: session.fullName },
      scope,
    );
    if (!updated) {
      redirect(
        "/manager?error=Could not pre-approve. It may already be pre-approved or outside your scope.",
      );
    }
    revalidateRolePaths();
    redirect(`/manager?success=Request ${refId} pre-approved.`);
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    redirect(
      `/manager?error=${encodeURIComponent(`Unable to pre-approve: ${String(error)}`)}`,
    );
  }
}
