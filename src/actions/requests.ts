"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { getSession } from "@/lib/auth";
import { ROLE_ROUTES, type Role } from "@/lib/constants";
import { readOtHoursFromFormData } from "@/lib/ot-hours";
import {
  computeAvailableOtOffsetBalance,
  computeHoursFromTimeRange,
  formatInsufficientOtOffsetBalanceMessage,
  OT_OFFSET_REQUEST_TYPE,
} from "@/lib/ot-offset-balance";
import { getActiveOtEligibleTypes } from "@/lib/ot-settings";
import {
  employeePortalRequestTypes,
  isConfiEmployee,
  isOtOrHolidayWorkRequestType,
  validateEmployeePortalOtFeatures,
  validateEmployeePortalTimeFields,
} from "@/lib/employee-portal";
import { addManagerOwnRequest, addRequest, updateRequestStatus } from "@/lib/requests";
import { shouldDirectHrConfiOwnSlipOnSubmit } from "@/lib/direct-hr-confi-slips";
import { getEmployeeByPlacement, verifyEmployeePlacement } from "@/lib/roster";

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
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const otHours = readOtHoursFromFormData(formData, "ot_hours", "ot_minutes");
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
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

  const otFeatureError = validateEmployeePortalOtFeatures(
    employee.employeeType,
    requestType,
    fileAsOtOffset,
  );
  if (otFeatureError) {
    redirect(`/employee?error=${encodeURIComponent(otFeatureError)}`);
  }

  const timeFieldError = validateEmployeePortalTimeFields(requestType, timeIn, timeOut);
  if (timeFieldError) {
    redirect(`/employee?error=${encodeURIComponent(timeFieldError)}`);
  }

  const timeRange = computeHoursFromTimeRange(timeIn, timeOut);
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

  try {
    const refId = shouldDirectHrConfiOwnSlipOnSubmit(employeeName)
      ? await addManagerOwnRequest({
          company,
          department,
          employeeName: employee.fullName,
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
          requestType,
          dateRequested,
          dateOfIncident,
          reason,
          timeIn: timeIn || null,
          timeOut: timeOut || null,
          otHrs: otStoredValue,
        });
    revalidateRolePaths();
    redirect(
      shouldDirectHrConfiOwnSlipOnSubmit(employeeName)
        ? `/employee?success=Request ${refId} submitted and sent to HR Confi pending.`
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
      ? {
          company: session.company ?? undefined,
          department: session.department ?? undefined,
        }
      : undefined;

  if (session.role === "Manager" && !session.company) {
    redirect("/manager?error=Your manager account has no company assigned.");
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
