"use client";

import { HR_SCOPES } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";
import { CompanyDepartmentFields } from "./company-department-fields";

type PortalUserModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  role: "Manager" | "HR" | "Verifier";
  departments: Department[];
  companies: string[];
  editing?: User | null;
};

export function PortalUserModal({
  open,
  cancelHref,
  saveAction,
  role,
  departments,
  companies,
  editing = null,
}: PortalUserModalProps) {
  const isEditing = Boolean(editing);
  const roleLabel =
    role === "Manager" ? "manager" : role === "Verifier" ? "verifier" : "HR account";

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isEditing ? `Edit ${roleLabel}` : `Add ${roleLabel}`}
      titleId="portal-user-modal-title"
    >
      <form action={saveAction} className="mt-5 space-y-4">
        {isEditing && editing && <input type="hidden" name="id" value={editing.id} />}

        <FormField label="Full name">
          <input
            name="full_name"
            required
            defaultValue={editing?.fullName ?? ""}
            className={inputClassName}
            autoFocus
          />
        </FormField>

        <FormField label="Username">
          <input
            name="username"
            required
            defaultValue={editing?.username ?? ""}
            className={inputClassName}
            autoComplete="off"
          />
        </FormField>

        <FormField label={isEditing ? "New password (optional)" : "Password"}>
          <input
            type="password"
            name="password"
            required={!isEditing}
            className={inputClassName}
            autoComplete="new-password"
            placeholder={isEditing ? "Leave blank to keep current" : ""}
          />
        </FormField>

        {role === "Manager" && (
          <CompanyDepartmentFields
            departments={departments}
            companies={companies}
            defaultCompany={editing?.company ?? ""}
            defaultDepartmentName={editing?.department ?? ""}
          />
        )}

        {role === "Verifier" && (
          <CompanyDepartmentFields
            departments={departments}
            companies={companies}
            defaultCompany={editing?.company ?? ""}
            defaultDepartmentName={editing?.department ?? ""}
            requireDepartment={false}
          />
        )}

        {role === "HR" && (
          <FormField label="HR scope">
            <select
              name="hr_scope"
              defaultValue={editing?.hrScope ?? ""}
              className={inputClassName}
            >
              <option value="">— Select —</option>
              {HR_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {scope}
                </option>
              ))}
            </select>
          </FormField>
        )}

        {isEditing && editing && (
          <FormField label="Status">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing.isActive}
                className="rounded border-slate-300"
              />
              Active
            </label>
          </FormField>
        )}

        <FormModalFooter cancelHref={cancelHref} />
      </form>
    </FormModal>
  );
}
