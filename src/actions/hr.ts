"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/action-auth";
import { createEmployee, updateEmployee } from "@/lib/roster";
import { archiveRequest, unarchiveRequest } from "@/lib/requests";
import { createUser, getUserById, getUserByUsername, updateUser } from "@/lib/users";
import { listDepartments } from "@/lib/departments";

function hrRedirect(params: { tab?: string; success?: string; error?: string }): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/hr?${search.toString()}`);
}

export async function archiveRequestAction(formData: FormData) {
  const session = await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "records", error: "Invalid request reference." });
  }

  const archived = await archiveRequest(refId, session.fullName);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!archived) {
    hrRedirect({ tab: "records", error: "Request could not be archived." });
  }

  hrRedirect({ tab: "records", success: `Request ${refId} archived.` });
}

export async function unarchiveRequestAction(formData: FormData) {
  await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "archived", error: "Invalid request reference." });
  }

  const restored = await unarchiveRequest(refId);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!restored) {
    hrRedirect({ tab: "archived", error: "Request could not be restored." });
  }

  hrRedirect({ tab: "archived", success: `Request ${refId} restored to active records.` });
}

export async function saveEmployeeRosterAction(formData: FormData) {
  await requireRoles(["HR"]);
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !departmentId) {
    hrRedirect({ tab: "employees", error: "Employee name and department are required." });
  }

  const departments = await listDepartments(true);
  const department = departments.find((row) => row.id === departmentId);
  if (!department) {
    hrRedirect({ tab: "employees", error: "Selected department is not available." });
  }

  try {
    if (id > 0) {
      const updated = await updateEmployee(id, { fullName, departmentId, isActive });
      if (!updated) {
        hrRedirect({ tab: "employees", error: "Employee not found." });
      }
      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/employee");
      hrRedirect({ tab: "employees", success: `Updated employee ${fullName}.` });
    }

    await createEmployee({ fullName, departmentId });
    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/employee");
    hrRedirect({ tab: "employees", success: `Added employee ${fullName}.` });
  } catch (error) {
    hrRedirect({
      tab: "employees",
      error: `Unable to save employee. ${String(error)}`,
    });
  }
}

export async function saveManagerAction(formData: FormData) {
  await requireRoles(["HR"]);
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const department = String(formData.get("department") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username || !department) {
    hrRedirect({ tab: "managers", error: "Name, username, and department are required." });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing || existing.role !== "Manager") {
        hrRedirect({ tab: "managers", error: "Manager account not found." });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          hrRedirect({ tab: "managers", error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        fullName,
        username,
        department,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/hr");
      revalidatePath("/admin");
      hrRedirect({ tab: "managers", success: `Updated manager ${fullName}.` });
    }

    if (!password) {
      hrRedirect({ tab: "managers", error: "Password is required for new manager accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      hrRedirect({ tab: "managers", error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role: "Manager",
      department,
    });

    revalidatePath("/hr");
    revalidatePath("/admin");
    hrRedirect({ tab: "managers", success: `Created manager account for ${fullName}.` });
  } catch (error) {
    hrRedirect({
      tab: "managers",
      error: `Unable to save manager. ${String(error)}`,
    });
  }
}
