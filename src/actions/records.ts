"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { REQUEST_TYPES, STATUSES } from "@/lib/constants";
import {
  employeePortalRequestTypes,
  isOtOrHolidayWorkRequestType,
  validateEmployeePortalOtFeatures,
  validateEmployeePortalTimeFields,
} from "@/lib/employee-portal";
import {
  computeAvailableOtOffsetBalance,
  computeHoursFromTimeRange,
  formatInsufficientOtOffsetBalanceMessage,
  OT_OFFSET_REQUEST_TYPE,
} from "@/lib/ot-offset-balance";
import { getActiveOtEligibleTypes } from "@/lib/ot-settings";
import { maskEmail, normalizeEmail, isValidEmail } from "@/lib/email";
import { isSmtpConfigured, sendMail } from "@/lib/mail";
import {
  buildRecordsEmailContent,
  isRecordRequestRateLimited,
  logRecordRequest,
  queryEmployeeRecords,
  recordsToCsv,
  type RecordRequestFilters,
} from "@/lib/record-requests";
import { updateEmployeePendingRequest } from "@/lib/requests";
import { getEmployeeByPlacement, verifyEmployeePlacement } from "@/lib/roster";

type RecordsRedirectParams = {
  success?: string;
  error?: string;
  view?: boolean;
  filters?: RecordRequestFilters;
  edit?: string;
  viewedAt?: number;
};

function recordsRedirect(params: RecordsRedirectParams): never {
  const search = new URLSearchParams({ section: "records" });

  if (params.filters) {
    search.set("view", "1");
    search.set("company", params.filters.company);
    search.set("department", params.filters.department);
    search.set("employee_name", params.filters.employeeName);
    search.set("submitted_from", params.filters.submittedFrom);
    search.set("submitted_to", params.filters.submittedTo);
    if (params.filters.requestType) search.set("request_type", params.filters.requestType);
    if (params.filters.status) search.set("status", params.filters.status);
    search.set("viewed_at", String(params.viewedAt ?? Date.now()));
  } else if (params.view) {
    search.set("view", "1");
  }

  if (params.edit) search.set("edit", params.edit);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);

  redirect(`/employee?${search.toString()}`);
}

function parseRecordFilters(formData: FormData): RecordRequestFilters | { error: string } {
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const submittedFrom = String(formData.get("submitted_from") ?? "").trim();
  const submittedTo = String(formData.get("submitted_to") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!company || !department || !employeeName) {
    return { error: "Please select company, department, and employee." };
  }

  if (!submittedFrom || !submittedTo) {
    return { error: "Please provide a date submitted range." };
  }

  if (submittedFrom > submittedTo) {
    return { error: "Start date must be on or before end date." };
  }

  if (requestType && !(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    return { error: "Invalid request type filter." };
  }

  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid status filter." };
  }

  return {
    company,
    department,
    employeeName,
    submittedFrom,
    submittedTo,
    requestType: requestType || undefined,
    status: status || undefined,
  };
}

async function getAuditContext() {
  const headerStore = await headers();
  const ipAddress =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    undefined;
  const userAgent = headerStore.get("user-agent") ?? undefined;
  return { ipAddress, userAgent };
}

export async function viewRecordsAction(formData: FormData) {
  const parsed = parseRecordFilters(formData);
  if ("error" in parsed) {
    recordsRedirect({ error: parsed.error });
  }

  const employee = await getEmployeeByPlacement(
    parsed.company,
    parsed.department,
    parsed.employeeName,
  );
  if (!employee) {
    recordsRedirect({
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  if (await isRecordRequestRateLimited(employee.id)) {
    recordsRedirect({
      error: "Too many record requests in the last hour. Please try again later or contact HR.",
    });
  }

  const rows = await queryEmployeeRecords(parsed);
  const audit = await getAuditContext();

  await logRecordRequest({
    ...parsed,
    employeeId: employee.id,
    rowCount: rows.length,
    action: "view",
    ...audit,
  });

  recordsRedirect({
    filters: parsed,
    viewedAt: Date.now(),
    success: `${rows.length} record(s) loaded below.`,
  });
}

export async function requestRecordsAction(formData: FormData) {
  const parsed = parseRecordFilters(formData);
  if ("error" in parsed) {
    recordsRedirect({ error: parsed.error });
  }

  const employee = await getEmployeeByPlacement(
    parsed.company,
    parsed.department,
    parsed.employeeName,
  );
  if (!employee) {
    recordsRedirect({
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  const email = employee.email?.trim() ?? "";
  if (!email) {
    recordsRedirect({
      filters: parsed,
      error:
        "No email is on file for this employee. Please proceed to HR to add or update your email on the roster.",
    });
  }

  if (!isValidEmail(email)) {
    recordsRedirect({
      filters: parsed,
      error:
        "The email on file for this employee is invalid. Please ask HR to update your roster email.",
    });
  }

  if (!isSmtpConfigured()) {
    recordsRedirect({
      filters: parsed,
      error: "Email delivery is not configured yet. Please contact HR or IT.",
    });
  }

  if (await isRecordRequestRateLimited(employee.id)) {
    recordsRedirect({
      filters: parsed,
      error: "Too many record requests in the last hour. Please try again later or contact HR.",
    });
  }

  try {
    const rows = await queryEmployeeRecords(parsed);
    const csv = recordsToCsv(rows);
    const emailContent = buildRecordsEmailContent({
      employeeName: parsed.employeeName,
      company: parsed.company,
      department: parsed.department,
      filters: parsed,
      rowCount: rows.length,
    });

    await sendMail({
      to: normalizeEmail(email),
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      attachments: [
        {
          filename: emailContent.filename,
          content: csv,
        },
      ],
    });

    const audit = await getAuditContext();
    await logRecordRequest({
      ...parsed,
      employeeId: employee.id,
      emailSentTo: normalizeEmail(email),
      rowCount: rows.length,
      action: "email",
      ...audit,
    });

    recordsRedirect({
      filters: parsed,
      success: `Records sent to ${maskEmail(normalizeEmail(email))}. ${rows.length} record(s) included.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const friendly =
      message.includes("Greeting never received") || message.includes("Greeting timeout")
        ? "The mail server did not respond from the cloud host. Ask IT to allow external SMTP, or try SMTP port 587 with SMTP_SECURE=false on Vercel."
        : message.includes("ETIMEDOUT") || message.includes("timeout")
          ? "Email server timed out. Please try again or contact HR/IT."
          : message.includes("ECONNREFUSED") || message.includes("connect")
            ? "Could not connect to the email server. Please contact HR/IT."
            : `Unable to send records email. ${message}`;
    recordsRedirect({ filters: parsed, error: friendly });
  }
}

export async function updateEmployeeRecordAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const submittedFrom = String(formData.get("submitted_from") ?? "").trim();
  const submittedTo = String(formData.get("submitted_to") ?? "").trim();
  const requestTypeFilter = String(formData.get("filter_request_type") ?? "").trim();
  const statusFilter = String(formData.get("filter_status") ?? "").trim();

  const parsed: RecordRequestFilters = {
    company,
    department,
    employeeName,
    submittedFrom,
    submittedTo,
    requestType: requestTypeFilter || undefined,
    status: statusFilter || undefined,
  };

  if (!company || !department || !employeeName || !submittedFrom || !submittedTo) {
    recordsRedirect({ error: "Missing record context. Please view records again." });
  }

  const refId = String(formData.get("ref_id") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const dateRequested = String(formData.get("date_requested") ?? "").trim();
  const dateOfIncident = String(formData.get("date_of_incident") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!refId) {
    recordsRedirect({ filters: parsed, error: "Invalid request reference." });
  }

  if (!requestType || !dateOfIncident || !reason) {
    recordsRedirect({ filters: parsed, error: "Request type, incident date, and reason are required." });
  }

  if (!(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    recordsRedirect({ filters: parsed, error: "Invalid request type." });
  }

  const validEmployee = await verifyEmployeePlacement(
    parsed.company,
    parsed.department,
    parsed.employeeName,
  );
  if (!validEmployee) {
    recordsRedirect({
      filters: parsed,
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  const employee = await getEmployeeByPlacement(
    parsed.company,
    parsed.department,
    parsed.employeeName,
  );
  if (!employee) {
    recordsRedirect({ filters: parsed, error: "Employee not found on roster." });
  }

  const allowedRequestTypes = employeePortalRequestTypes(employee.employeeType);
  if (!allowedRequestTypes.includes(requestType)) {
    recordsRedirect({
      filters: parsed,
      error: "This request type is not available for the selected employee.",
    });
  }

  const otFeatureError = validateEmployeePortalOtFeatures(
    employee.employeeType,
    requestType,
    fileAsOtOffset,
  );
  if (otFeatureError) {
    recordsRedirect({ filters: parsed, error: otFeatureError });
  }

  const timeFieldError = validateEmployeePortalTimeFields(requestType, timeIn, timeOut);
  if (timeFieldError) {
    recordsRedirect({ filters: parsed, error: timeFieldError });
  }

  const timeRange = computeHoursFromTimeRange(timeIn, timeOut);
  if (!timeRange.valid) {
    recordsRedirect({
      filters: parsed,
      error: timeRange.error ?? "Invalid From/To times.",
    });
  }

  let otStoredValue: string | null = null;

  if (requestType === OT_OFFSET_REQUEST_TYPE) {
    if (timeRange.empty || timeRange.totalHours <= 0) {
      recordsRedirect({
        filters: parsed,
        error: "Enter valid From and To times for OT Offset.",
      });
    }

    const otEligibleTypes = await getActiveOtEligibleTypes();
    const availableBalance = await computeAvailableOtOffsetBalance(
      {
        company: parsed.company,
        department: parsed.department,
        employeeName: parsed.employeeName,
      },
      otEligibleTypes,
    );

    if (timeRange.totalHours > availableBalance) {
      recordsRedirect({
        filters: parsed,
        error: formatInsufficientOtOffsetBalanceMessage(
          availableBalance,
          timeRange.totalHours,
        ),
      });
    }

    otStoredValue = timeRange.storedValue;
  } else if (isOtOrHolidayWorkRequestType(requestType)) {
    if (timeRange.empty || timeRange.totalHours <= 0) {
      recordsRedirect({
        filters: parsed,
        error: "Enter valid From and To times to calculate hours to claim.",
      });
    }
    otStoredValue = timeRange.storedValue;
  }

  if (fileAsOtOffset && !reason.startsWith("[OT offset credit]")) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const updated = await updateEmployeePendingRequest(refId, {
      company: parsed.company,
      department: parsed.department,
      employeeName: parsed.employeeName,
      requestType,
      dateRequested,
      dateOfIncident,
      reason,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      otHrs: otStoredValue,
    });

    if (!updated) {
      recordsRedirect({
        filters: parsed,
        error:
          "This request can no longer be edited. Only pending, unverified requests can be changed.",
      });
    }

    const audit = await getAuditContext();
    await logRecordRequest({
      ...parsed,
      employeeId: employee.id,
      rowCount: 1,
      action: "edit",
      recordRefId: refId,
      ...audit,
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/employee");
    revalidatePath("/manager");
    revalidatePath("/verification");

    recordsRedirect({
      filters: parsed,
      viewedAt: Date.now(),
      success: `Request ${refId} updated successfully.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    recordsRedirect({
      filters: parsed,
      error: `Unable to update request. ${String(error)}`,
    });
  }
}
