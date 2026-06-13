"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles } from "@/lib/action-auth";
import { EMPLOYEE_TYPES, HR_SCOPES } from "@/lib/constants";
import { createDepartment, updateDepartment } from "@/lib/departments";
import { createEmployee, updateEmployee } from "@/lib/roster";
import { createUser, getUserById, getUserByUsername, updateUser } from "@/lib/users";

function adminRedirect(params: { tab?: string; success?: string; error?: string }): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  redirect(`/admin?${search.toString()}`);
}

export async function saveDepartmentAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!name) {
    adminRedirect({ tab: "departments", error: "Department name is required." });
  }

  try {
    if (id > 0) {
      const updated = await updateDepartment(id, { name, isActive });
      if (!updated) {
        adminRedirect({ tab: "departments", error: "Department not found." });
      }
      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/employee");
      adminRedirect({ tab: "departments", success: `Updated department ${name}.` });
    }

    await createDepartment(name);
    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "departments", success: `Added department ${name}.` });
  } catch (error) {
    adminRedirect({
      tab: "departments",
      error: `Unable to save department. ${String(error)}`,
    });
  }
}

export async function saveAdminEmployeeAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !departmentId || !employeeType) {
    adminRedirect({ tab: "employees", error: "Employee name, department, and type are required." });
  }

  if (!(EMPLOYEE_TYPES as readonly string[]).includes(employeeType)) {
    adminRedirect({ tab: "employees", error: "Invalid employee type." });
  }

  try {
    if (id > 0) {
      const updated = await updateEmployee(id, { fullName, departmentId, employeeType, isActive });
      if (!updated) {
        adminRedirect({ tab: "employees", error: "Employee not found." });
      }
      revalidatePath("/admin");
      revalidatePath("/hr");
      revalidatePath("/employee");
      adminRedirect({ tab: "employees", success: `Updated employee ${fullName}.` });
    }

    await createEmployee({ fullName, departmentId, employeeType });
    revalidatePath("/admin");
    revalidatePath("/hr");
    revalidatePath("/employee");
    adminRedirect({ tab: "employees", success: `Added employee ${fullName}.` });
  } catch (error) {
    adminRedirect({
      tab: "employees",
      error: `Unable to save employee. ${String(error)}`,
    });
  }
}

export async function saveAdminManagerAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "Manager", "managers");
}

export async function saveAdminHrAction(formData: FormData) {
  await requireRoles(["Admin"]);
  await savePortalUserAction(formData, "HR", "hr");
}

export async function saveCredentialsAction(formData: FormData) {
  await requireRoles(["Admin"]);
  const id = Number(formData.get("id") ?? 0);
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim() || null;
  const hrScope = String(formData.get("hr_scope") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!id || !username || !fullName || !role) {
    adminRedirect({ tab: "credentials", error: "All account fields are required." });
  }

  if (role === "HR" && hrScope && !(HR_SCOPES as readonly string[]).includes(hrScope)) {
    adminRedirect({ tab: "credentials", error: "Invalid HR scope." });
  }

  try {
    const existing = await getUserById(id);
    if (!existing) {
      adminRedirect({ tab: "credentials", error: "Account not found." });
    }

    if (username !== existing.username) {
      const taken = await getUserByUsername(username);
      if (taken) {
        adminRedirect({ tab: "credentials", error: "Username is already in use." });
      }
    }

    await updateUser(id, {
      username,
      fullName,
      role,
      department,
      hrScope: role === "HR" ? hrScope : null,
      isActive,
      ...(password ? { password } : {}),
    });

    revalidatePath("/admin");
    revalidatePath("/hr");
    adminRedirect({ tab: "credentials", success: `Updated credentials for ${fullName}.` });
  } catch (error) {
    adminRedirect({
      tab: "credentials",
      error: `Unable to update credentials. ${String(error)}`,
    });
  }
}

async function savePortalUserAction(
  formData: FormData,
  role: "Manager" | "HR",
  tab: "managers" | "hr",
) {
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const department = String(formData.get("department") ?? "").trim() || null;
  const hrScope = String(formData.get("hr_scope") ?? "").trim() || null;
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username) {
    adminRedirect({ tab, error: "Name and username are required." });
  }

  if (role === "Manager" && !department) {
    adminRedirect({ tab, error: "Department is required for managers." });
  }

  if (role === "HR" && hrScope && !(HR_SCOPES as readonly string[]).includes(hrScope)) {
    adminRedirect({ tab, error: "Invalid HR scope." });
  }

  try {
    if (id > 0) {
      const existing = await getUserById(id);
      if (!existing || existing.role !== role) {
        adminRedirect({ tab, error: `${role} account not found.` });
      }

      if (username !== existing.username) {
        const taken = await getUserByUsername(username);
        if (taken) {
          adminRedirect({ tab, error: "Username is already in use." });
        }
      }

      await updateUser(id, {
        fullName,
        username,
        department: role === "Manager" ? department : null,
        hrScope: role === "HR" ? hrScope : null,
        isActive,
        ...(password ? { password } : {}),
      });

      revalidatePath("/admin");
      revalidatePath("/hr");
      adminRedirect({ tab, success: `Updated ${role.toLowerCase()} account for ${fullName}.` });
    }

    if (!password) {
      adminRedirect({ tab, error: "Password is required for new accounts." });
    }

    const taken = await getUserByUsername(username);
    if (taken) {
      adminRedirect({ tab, error: "Username is already in use." });
    }

    await createUser({
      username,
      password,
      fullName,
      role,
      department: role === "Manager" ? department : null,
      hrScope: role === "HR" ? hrScope : null,
    });

    revalidatePath("/admin");
    revalidatePath("/hr");
    adminRedirect({ tab, success: `Created ${role.toLowerCase()} account for ${fullName}.` });
  } catch (error) {
    adminRedirect({
      tab,
      error: `Unable to save account. ${String(error)}`,
    });
  }
}
