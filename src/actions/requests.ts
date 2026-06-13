"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { getSession } from "@/lib/auth";
import { ROLE_ROUTES } from "@/lib/constants";
import { addRequest, updateRequestStatus } from "@/lib/requests";

function revalidateRolePaths() {
  for (const path of Object.values(ROLE_ROUTES)) {
    revalidatePath(path);
  }
}

export async function submitRequestAction(formData: FormData) {
  const department = String(formData.get("department") ?? "").trim();
  const employeeName = String(formData.get("employee_name") ?? "");
  const requestType = String(formData.get("request_type") ?? "");
  const dateRequested = String(formData.get("date_requested") ?? "");
  const dateOfIncident = String(formData.get("date_of_incident") ?? "");
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const otHrs = String(formData.get("ot_hrs") ?? "").trim();
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    redirect("/employee?error=Please provide a reason before submitting.");
  }

  if (fileAsOtOffset) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const refId = await addRequest({
      department,
      employeeName,
      requestType,
      dateRequested,
      dateOfIncident,
      reason,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      otHrs: otHrs || null,
    });
    revalidateRolePaths();
    redirect(`/employee?success=Request ${refId} submitted successfully and is pending manager review.`);
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

  const department = session.role === "Manager" ? session.department ?? undefined : undefined;
  if (session.role === "Manager" && !department) {
    redirect("/manager?error=Your manager account has no department assigned.");
  }

  try {
    const updated = await updateRequestStatus(
      refId,
      status,
      session.fullName,
      department,
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

