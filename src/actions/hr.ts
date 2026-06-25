"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRoles, isNextNavigationError } from "@/lib/action-auth";
import { EMPLOYEE_TYPES } from "@/lib/constants";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { createCompany, isActiveCompany, updateCompany } from "@/lib/companies";
import {
  saveOtEligibleTypes,
  updatePayrollCutoffRule,
  validateCutoffDays,
} from "@/lib/ot-settings";
import { createEmployee, updateEmployee } from "@/lib/roster";
import { archiveRequest, hrRejectApprovedRequest, unarchiveRequest } from "@/lib/requests";
import { createUser, getUserById, getUserByUsername, updateUser } from "@/lib/users";
import { listDepartments } from "@/lib/departments";

function hrRedirect(params: {
  tab?: string;
  success?: string;
  error?: string;
  settings?: boolean;
}): never {
  const search = new URLSearchParams();
  if (params.tab) search.set("tab", params.tab);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  if (params.settings) search.set("settings", "1");
  redirect(`/hr?${search.toString()}`);
}

export async function checkRequestAction(formData: FormData) {
  const session = await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "pending", error: "Invalid request reference." });
  }

  const archived = await archiveRequest(refId, session.fullName);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!archived) {
    hrRedirect({ tab: "pending", error: "Request could not be marked as checked." });
  }

  hrRedirect({ tab: "pending", success: `Request ${refId} marked as checked.` });
}

export async function hrRejectRequestAction(formData: FormData) {
  const session = await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "pending", error: "Invalid request reference." });
  }

  if (!rejectionReason) {
    hrRedirect({ tab: "pending", error: "A rejection reason is required." });
  }

  const rejected = await hrRejectApprovedRequest(refId, session.fullName, rejectionReason);
  revalidatePath("/hr");
  revalidatePath("/manager");
  revalidatePath("/api/export/csv");

  if (!rejected) {
    hrRedirect({ tab: "pending", error: "Request could not be rejected." });
  }

  hrRedirect({ tab: "pending", success: `Request ${refId} rejected.` });
}

export async function archiveRequestAction(formData: FormData) {
  const session = await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "pending", error: "Invalid request reference." });
  }

  const archived = await archiveRequest(refId, session.fullName);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!archived) {
    hrRedirect({ tab: "pending", error: "Request could not be archived." });
  }

  hrRedirect({ tab: "pending", success: `Request ${refId} archived.` });
}

export async function unarchiveRequestAction(formData: FormData) {
  await requireRoles(["HR"]);
  const refId = String(formData.get("ref_id") ?? "").trim();

  if (!refId) {
    hrRedirect({ tab: "checked", error: "Invalid request reference." });
  }

  const restored = await unarchiveRequest(refId);
  revalidatePath("/hr");
  revalidatePath("/api/export/csv");

  if (!restored) {
    hrRedirect({ tab: "checked", error: "Request could not be restored." });
  }

  hrRedirect({ tab: "checked", success: `Request ${refId} restored to pending.` });
}

export async function saveEmployeeRosterAction(formData: FormData) {
  await requireRoles(["HR"]);
  const id = Number(formData.get("id") ?? 0);
  const fullName = String(formData.get("full_name") ?? "").trim();
  const departmentId = Number(formData.get("department_id") ?? 0);
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const isActive = formData.get("is_active") === "on";
  const emailRaw = String(formData.get("email") ?? "").trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;

  if (!fullName || !departmentId || !employeeType) {
    hrRedirect({ tab: "employees", error: "Employee name, department, and type are required." });
  }

  if (emailRaw && !isValidEmail(emailRaw)) {
    hrRedirect({ tab: "employees", error: "Please enter a valid email address." });
  }

  if (!(EMPLOYEE_TYPES as readonly string[]).includes(employeeType)) {
    hrRedirect({ tab: "employees", error: "Invalid employee type." });
  }

  const departments = await listDepartments(true);
  const department = departments.find((row) => row.id === departmentId);
  if (!department) {
    hrRedirect({ tab: "employees", error: "Selected department is not available." });
  }

  try {
    if (id > 0) {
      const updated = await updateEmployee(id, {
        fullName,
        departmentId,
        employeeType,
        email,
        isActive,
      });
      if (!updated) {
        hrRedirect({ tab: "employees", error: "Employee not found." });
      }
      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/employee");
      hrRedirect({ tab: "employees", success: `Updated employee ${fullName}.` });
    }

    await createEmployee({ fullName, departmentId, employeeType, email });
    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/employee");
    hrRedirect({ tab: "employees", success: `Added employee ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
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
  const company = String(formData.get("company") ?? "").trim();
  const department = String(formData.get("department") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!fullName || !username || !company || !department) {
    hrRedirect({ tab: "managers", error: "Name, username, company, and department are required." });
  }

  if (!(await isActiveCompany(company))) {
    hrRedirect({ tab: "managers", error: "Invalid or inactive company." });
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
        company,
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
      company,
      department,
    });

    revalidatePath("/hr");
    revalidatePath("/admin");
    hrRedirect({ tab: "managers", success: `Created manager account for ${fullName}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "managers",
      error: `Unable to save manager. ${String(error)}`,
    });
  }
}

export async function savePayrollCutoffRulesAction(formData: FormData) {
  await requireRoles(["HR"]);
  const employeeType = String(formData.get("employee_type") ?? "").trim();
  const cutoffDay1 = Number(formData.get("cutoff_day_1"));
  const cutoffDay2 = Number(formData.get("cutoff_day_2"));

  if (!employeeType) {
    hrRedirect({ tab: "ot-summary", settings: true, error: "Employee type is required." });
  }

  const validationError = validateCutoffDays(cutoffDay1, cutoffDay2);
  if (validationError) {
    hrRedirect({ tab: "ot-summary", settings: true, error: validationError });
  }

  const updated = await updatePayrollCutoffRule(employeeType, cutoffDay1, cutoffDay2);
  revalidatePath("/hr");

  if (!updated) {
    hrRedirect({ tab: "ot-summary", settings: true, error: "Cutoff rule not found." });
  }

  hrRedirect({
    tab: "ot-summary",
    settings: true,
    success: `Updated ${employeeType} cutoff days to ${cutoffDay1} and ${cutoffDay2}.`,
  });
}

export async function saveOtEligibleTypesAction(formData: FormData) {
  await requireRoles(["HR"]);
  const activeTypes = formData.getAll("eligible_types").map((value) => String(value));

  await saveOtEligibleTypes(activeTypes);
  revalidatePath("/hr");
  hrRedirect({ tab: "ot-summary", settings: true, success: "Updated OT-eligible request types." });
}

export async function saveHrCompanyAction(formData: FormData) {
  await requireRoles(["HR"]);
  const id = Number(formData.get("id") ?? 0);
  const name = String(formData.get("name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!name) {
    hrRedirect({ tab: "companies", error: "Company name is required." });
  }

  try {
    if (id > 0) {
      const updated = await updateCompany(id, { name, isActive });
      if (!updated) {
        hrRedirect({ tab: "companies", error: "Company not found." });
      }
      revalidatePath("/hr");
      revalidatePath("/admin");
      revalidatePath("/employee");
      hrRedirect({ tab: "companies", success: `Updated company ${name}.` });
    }

    await createCompany(name);
    revalidatePath("/hr");
    revalidatePath("/admin");
    revalidatePath("/employee");
    hrRedirect({ tab: "companies", success: `Added company ${name}.` });
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    hrRedirect({
      tab: "companies",
      error: `Unable to save company. ${String(error)}`,
    });
  }
}
