"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isNextNavigationError } from "@/lib/action-auth";
import { getSession } from "@/lib/auth";
import { ROLE_ROUTES } from "@/lib/constants";
import { addManagerOwnRequest } from "@/lib/requests";
import { getEmployeeByPlacement } from "@/lib/roster";

function managerRedirect(params: { success?: string; error?: string } = {}): never {
  const search = new URLSearchParams({ tab: "file" });
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/manager?${search.toString()}`);
}

function revalidateRolePaths() {
  for (const path of Object.values(ROLE_ROUTES)) {
    revalidatePath(path);
  }
}

export async function submitManagerSlipAction(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "Manager") {
    redirect("/manager?tab=file&error=You are not authorized to file slips here.");
  }

  const company = session.company?.trim() ?? "";
  const department = session.department?.trim() ?? "";
  const managerName = session.fullName.trim();

  const requestType = String(formData.get("request_type") ?? "").trim();
  const dateRequested = String(formData.get("date_requested") ?? "").trim();
  const dateOfIncident = String(formData.get("date_of_incident") ?? "").trim();
  const timeIn = String(formData.get("time_in") ?? "").trim();
  const timeOut = String(formData.get("time_out") ?? "").trim();
  const otHrs = String(formData.get("ot_hrs") ?? "").trim();
  const fileAsOtOffset = formData.get("file_as_ot_offset") === "on";
  let reason = String(formData.get("reason") ?? "").trim();

  if (!company || !department) {
    managerRedirect({
      error: "Your manager account has no company or department assigned. Contact HR.",
    });
  }

  if (!managerName) {
    managerRedirect({ error: "Your manager account has no name on file." });
  }

  if (!requestType || !dateOfIncident || !reason) {
    managerRedirect({ error: "Request type, incident date, and reason are required." });
  }

  const employee = await getEmployeeByPlacement(company, department, managerName);
  if (!employee) {
    managerRedirect({
      error:
        "Your manager account name must match your name on the employee roster for this company and department.",
    });
  }

  if (fileAsOtOffset) {
    reason = `[OT offset credit] ${reason}`;
  }

  try {
    const refId = await addManagerOwnRequest({
      company,
      department,
      employeeName: managerName,
      managerName,
      requestType,
      dateRequested,
      dateOfIncident,
      reason,
      timeIn: timeIn || null,
      timeOut: timeOut || null,
      otHrs: otHrs || null,
    });

    revalidateRolePaths();
    managerRedirect({
      success: `Request ${refId} filed and sent to HR Confi pending (manager approval skipped).`,
    });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    managerRedirect({
      error: `Unable to file your slip. ${String(error)}`,
    });
  }
}
