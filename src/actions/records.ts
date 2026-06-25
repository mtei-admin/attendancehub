"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { maskEmail, normalizeEmail, isValidEmail } from "@/lib/email";
import { isSmtpConfigured, sendMail } from "@/lib/mail";
import {
  buildRecordsEmailContent,
  isRecordRequestRateLimited,
  logRecordRequest,
  queryEmployeeRecords,
  recordsToCsv,
} from "@/lib/record-requests";
import { STATUSES, REQUEST_TYPES } from "@/lib/constants";
import { getEmployeeByPlacement } from "@/lib/roster";

function recordsRedirect(params: { success?: string; error?: string }): never {
  const search = new URLSearchParams({ section: "records" });
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/employee?${search.toString()}`);
}

export async function requestRecordsAction(formData: FormData) {
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const submittedFrom = String(formData.get("submitted_from") ?? "").trim();
  const submittedTo = String(formData.get("submitted_to") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!company || !department || !employeeName) {
    recordsRedirect({ error: "Please select company, department, and employee." });
  }

  if (!submittedFrom || !submittedTo) {
    recordsRedirect({ error: "Please provide a date submitted range." });
  }

  if (submittedFrom > submittedTo) {
    recordsRedirect({ error: "Start date must be on or before end date." });
  }

  if (requestType && !(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    recordsRedirect({ error: "Invalid request type filter." });
  }

  if (status && !(STATUSES as readonly string[]).includes(status)) {
    recordsRedirect({ error: "Invalid status filter." });
  }

  const employee = await getEmployeeByPlacement(company, department, employeeName);
  if (!employee) {
    recordsRedirect({ error: "Selected employee does not match the chosen company and department." });
  }

  const email = employee.email?.trim() ?? "";
  if (!email) {
    recordsRedirect({
      error:
        "No email is on file for this employee. Please proceed to HR to add or update your email on the roster.",
    });
  }

  if (!isValidEmail(email)) {
    recordsRedirect({
      error:
        "The email on file for this employee is invalid. Please ask HR to update your roster email.",
    });
  }

  if (!isSmtpConfigured()) {
    recordsRedirect({
      error: "Email delivery is not configured yet. Please contact HR or IT.",
    });
  }

  if (await isRecordRequestRateLimited(employee.id)) {
    recordsRedirect({
      error: "Too many record requests in the last hour. Please try again later or contact HR.",
    });
  }

  const filters = {
    company,
    department,
    employeeName,
    submittedFrom,
    submittedTo,
    requestType: requestType || undefined,
    status: status || undefined,
  };

  try {
    const rows = await queryEmployeeRecords(filters);
    const csv = recordsToCsv(rows);
    const emailContent = buildRecordsEmailContent({
      employeeName,
      company,
      department,
      filters,
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

    const headerStore = await headers();
    const ipAddress =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      null;
    const userAgent = headerStore.get("user-agent");

    await logRecordRequest({
      ...filters,
      employeeId: employee.id,
      emailSentTo: normalizeEmail(email),
      rowCount: rows.length,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
    });

    recordsRedirect({
      success: `Records sent to ${maskEmail(normalizeEmail(email))}. ${rows.length} record(s) included.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const friendly =
      message.includes("Greeting never received") ||
      message.includes("Greeting timeout")
        ? "The mail server did not respond from the cloud host. Ask IT to allow external SMTP, or try SMTP port 587 with SMTP_SECURE=false on Vercel."
        : message.includes("ETIMEDOUT") || message.includes("timeout")
          ? "Email server timed out. Please try again or contact HR/IT."
          : message.includes("ECONNREFUSED") || message.includes("connect")
            ? "Could not connect to the email server. Please contact HR/IT."
            : `Unable to send records email. ${message}`;
    recordsRedirect({ error: friendly });
  }
}
