"use client";

import { useState } from "react";

import { saveCredentialsAction } from "@/actions/admin";
import { HR_SCOPES, ROLES, managerDepartmentFieldDefault } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { CompanyDepartmentFields } from "./company-department-fields";
import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";

type CredentialsModalProps = {
  open: boolean;
  cancelHref: string;
  departments: Department[];
  companies: string[];
  editing?: User | null;
  isAdding?: boolean;
};

export function CredentialsModal({
  open,
  cancelHref,
  departments,
  companies,
  editing = null,
  isAdding = false,
}: CredentialsModalProps) {
  const isEditing = Boolean(editing);
  const [role, setRole] = useState(editing?.role ?? "Employee");

  if (!open) return null;

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isAdding ? "Add user" : `Edit credentials — ${editing?.fullName ?? ""}`}
      titleId="credentials-modal-title"
      size="lg"
    >
      <form action={saveCredentialsAction} className="mt-5 space-y-4">
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
            required={isAdding}
            className={inputClassName}
            autoComplete="new-password"
            placeholder={isEditing ? "Leave blank to keep current" : ""}
          />
        </FormField>

        <FormField label="Role">
          <select
            name="role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className={inputClassName}
          >
            {ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        {role === "Manager" && (
          <CompanyDepartmentFields
            departments={departments}
            companies={companies}
            defaultCompany={editing?.company ?? ""}
            defaultDepartmentName={managerDepartmentFieldDefault(editing?.department, isEditing)}
            allowAllDepartments
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
            <select name="hr_scope" defaultValue={editing?.hrScope ?? ""} className={inputClassName}>
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
