"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { ROLE_ROUTES } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { verifyRequest } from "@/lib/requests";
import { verifyEmployeePlacement } from "@/lib/roster";
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

  const scope = buildVerifierScope(session.company, session.department);
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

  if (scope.department && department !== scope.department) {
    verificationRedirect({
      tab: "pending",
      error: "Request department is outside your verification scope.",
    });
  }

  if (isOwnSlip(session.fullName, employeeName)) {
    verificationRedirect({ tab: "pending", error: "You cannot verify your own request." });
  }

  const validEmployee = await verifyEmployeePlacement(company, department, employeeName);
  if (!validEmployee) {
    verificationRedirect({
      tab: "pending",
      error: "Selected employee does not match the chosen company and department.",
    });
  }

  if (fileAsOtOffset && !reason.startsWith("[OT offset credit]")) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const updated = await verifyRequest(
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
        otHrs: otHrs || null,
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
