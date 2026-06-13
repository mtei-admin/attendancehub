"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  const reason = String(formData.get("reason") ?? "").trim();

  if (!reason) {
    redirect("/employee?error=Please provide a reason before submitting.");
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
    });
    revalidateRolePaths();
    redirect(`/employee?success=Request ${refId} submitted successfully and is pending manager review.`);
  } catch (error) {
    redirect(
      `/employee?error=${encodeURIComponent(`Unable to submit your request. Please try again. (${String(error)})`)}`,
    );
  }
}

export async function updateStatusAction(formData: FormData) {
  const refId = String(formData.get("ref_id") ?? "");
  const status = String(formData.get("status") ?? "") as "Approved" | "Rejected";

  if (!refId || (status !== "Approved" && status !== "Rejected")) {
    redirect("/manager?error=Invalid request.");
  }

  try {
    const updated = await updateRequestStatus(refId, status);
    if (!updated) {
      redirect(
        "/manager?error=Request could not be updated. It may have already been processed.",
      );
    }
    revalidateRolePaths();
    redirect(`/manager?success=Request ${refId} ${status.toLowerCase()}.`);
  } catch (error) {
    redirect(
      `/manager?error=${encodeURIComponent(`Unable to update request: ${String(error)}`)}`,
    );
  }
}

