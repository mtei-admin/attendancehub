"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { ROLE_ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { notifyManagersOfOtReapproval } from "@/lib/basecamp";
import { listEmployeeIdsVisibleToVerifier } from "@/lib/employee-verifiers";
import { readOtHoursFromFormData } from "@/lib/ot-hours";
import {
  computeHoursFromTimeRange,
  computeOtOffsetHoursFromTimeRange,
  OT_OFFSET_REQUEST_TYPE,
} from "@/lib/ot-offset-balance";
import {
  COMPLETION_NEEDS_REAPPROVAL,
  COMPLETION_WITHIN,
  type CompletionOutcome,
} from "@/lib/pre-approved-ot";
import {
  completePreApprovedOtRequest,
  getRequestByRefId,
  verifyRequest,
} from "@/lib/requests";
import { getEmployeeByPlacement, verifyEmployeePlacement } from "@/lib/roster";
import { buildVerifierScope, isOwnSlip } from "@/lib/verification";

function revalidatePortalPaths() {
  for (const path of Object.values(ROLE_ROUTES)) {
    revalidatePath(path);
  }
}

function verificationRedirect(params: { tab?: string; success?: string; error?: string }): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/verification?${search.toString()}`);
}

export async function verifyRequestAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "Verifier") {
    redirect("/verification?error=You are not authorized to verify requests.");
  }

  if (!session.company) {
    redirect("/verification?error=Your verifier account has no company assigned.");
  }

  const visible = await listEmployeeIdsVisibleToVerifier({
    verifierUserId: session.userId,
    company: session.company,
  });
  const scope = buildVerifierScope(session.company, visible);
  if (!scope) {
    redirect("/verification?error=Your verifier account has no company assigned.");
  }

  const refId = String(formData.get("ref_id") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "").trim();
  const requestType = String(formData.get("request_type") ?? "").trim();
  const dateRequested = String(formData.get("date_requested") ?? "").trim();
  const dateOfIncident = String(formData.get("date_of_incident") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const otHrs = String(formData.get("ot_hrs") ?? "").trim();
  const verificationNote = String(formData.get("verification_note") ?? "").trim();
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!refId) {
    verificationRedirect({ tab: "pending", error: "Invalid request reference." });
  }

  if (!company || !department || !employeeName || !requestType || !dateOfIncident || !reason) {
    verificationRedirect({
      tab: "pending",
      error: "Company, department, employee, request type, incident date, and reason are required.",
    });
  }

  if (company !== scope.company) {
    verificationRedirect({ tab: "pending", error: "Request company is outside your verification scope." });
  }

  if (isOwnSlip(session.fullName, employeeName)) {
    verificationRedirect({ tab: "pending", error: "You cannot verify your own request." });
  }

  const employee = await getEmployeeByPlacement(company, department, employeeName);
  if (!employee || !(await verifyEmployeePlacement(company, department, employeeName))) {
    verificationRedirect({
      tab: "pending",
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  if (!scope.employeeIds.includes(employee.id)) {
    verificationRedirect({
      tab: "pending",
      error: "This employee is outside your verification assignments.",
    });
  }

  if (fileAsOtOffset && !reason.startsWith("[OT offset credit]")) {
    reason = `[OT offset credit] ${reason}`;
  }

  let storedOtHrs = otHrs || null;
  if (requestType === OT_OFFSET_REQUEST_TYPE) {
    if (!timeIn || !timeOut) {
      verificationRedirect({
        tab: "pending",
        error: "From and To times are required for OT Offset.",
      });
    }

    const timeRange = computeOtOffsetHoursFromTimeRange(timeIn, timeOut, { required: true });
    if (!timeRange.valid || timeRange.totalHours <= 0) {
      verificationRedirect({
        tab: "pending",
        error: timeRange.error ?? "Enter valid From and To times for OT Offset.",
      });
    }
    storedOtHrs = timeRange.storedValue;
  }

  try {
    const updated = await verifyRequest(
      refId,
      {
        company,
        department,
        employeeName,
        employeeId: employee.id,
        requestType,
        dateRequested,
        dateOfIncident,
        timeIn: timeIn || null,
        timeOut: timeOut || null,
        otHrs: storedOtHrs,
        reason,
        verificationNote: verificationNote || null,
      },
      session.fullName,
      scope,
    );

    if (!updated) {
      verificationRedirect({
        tab: "pending",
        error: "Request could not be verified. It may have already been verified or is outside your scope.",
      });
    }

    revalidatePortalPaths();
    verificationRedirect({ tab: "verified", success: `Request ${refId} verified successfully.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    verificationRedirect({
      tab: "pending",
      error: `Unable to verify request: ${String(error)}`,
    });
  }
}

export async function completePreApprovedOtAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "Verifier") {
    redirect("/verification?error=You are not authorized to verify requests.");
  }

  if (!session.company) {
    redirect("/verification?error=Your verifier account has no company assigned.");
  }

  const visible = await listEmployeeIdsVisibleToVerifier({
    verifierUserId: session.userId,
    company: session.company,
  });
  const scope = buildVerifierScope(session.company, visible);
  if (!scope) {
    redirect("/verification?error=Your verifier account has no company assigned.");
  }

  const refId = String(formData.get("ref_id") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const verificationNote = String(formData.get("verification_note") ?? "").trim();
  const outcomeRaw = String(formData.get("completion_outcome") ?? "").trim();
  const otHours = readOtHoursFromFormData(formData, "ot_hours", "ot_minutes");

  if (!refId) {
    verificationRedirect({ tab: "pending", error: "Invalid request reference." });
  }

  const outcome: CompletionOutcome | null =
    outcomeRaw === COMPLETION_WITHIN || outcomeRaw === COMPLETION_NEEDS_REAPPROVAL
      ? outcomeRaw
      : null;
  if (!outcome) {
    verificationRedirect({
      tab: "pending",
      error: "Choose Within plan or Needs re-approval.",
    });
  }

  if (!timeIn || !timeOut) {
    verificationRedirect({ tab: "pending", error: "Actual From and To times are required." });
  }

  const timeRange = computeHoursFromTimeRange(timeIn, timeOut);
  if (!timeRange.valid || timeRange.empty || timeRange.totalHours <= 0) {
    verificationRedirect({
      tab: "pending",
      error: timeRange.error ?? "Enter valid actual From and To times.",
    });
  }

  const storedOt =
    otHours.valid && otHours.storedValue ? otHours.storedValue : timeRange.storedValue;

  try {
    const existing = await getRequestByRefId(refId);
    const updated = await completePreApprovedOtRequest(
      refId,
      {
        timeIn,
        timeOut,
        otHrs: storedOt,
        outcome,
        verificationNote: verificationNote || null,
      },
      session.fullName,
      scope,
    );

    if (!updated) {
      verificationRedirect({
        tab: "pending",
        error:
          "Could not complete pre-approved OT. It may be outside your assignments or not ready yet.",
      });
    }

    if (outcome === COMPLETION_NEEDS_REAPPROVAL && existing) {
      const plannedSummary = [
        existing.plannedTimeIn || "—",
        "–",
        existing.plannedTimeOut || "—",
        existing.plannedOtHrs ? ` (${existing.plannedOtHrs} hrs)` : "",
      ].join("");
      const actualSummary = `${timeIn}–${timeOut} (${storedOt} hrs)`;
      after(() =>
        notifyManagersOfOtReapproval({
          company: existing.company ?? "",
          department: existing.department ?? "",
          employeeName: existing.employeeName,
          dateOfIncident: existing.dateOfIncident,
          refId,
          plannedSummary,
          actualSummary,
          preApprovedBy: existing.preApprovedBy,
        }),
      );
    }

    revalidatePortalPaths();
    verificationRedirect({
      tab: outcome === COMPLETION_WITHIN ? "verified" : "pending",
      success:
        outcome === COMPLETION_WITHIN
          ? `Request ${refId} completed within plan and sent to HR.`
          : `Request ${refId} marked for manager re-approval.`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    verificationRedirect({
      tab: "pending",
      error: `Unable to complete pre-approved OT: ${String(error)}`,
    });
  }
}
