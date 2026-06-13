"use client";

import { saveCredentialsAction } from "@/actions/admin";
import { HR_SCOPES, ROLES } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";

type CredentialsModalProps = {
  open: boolean;
  cancelHref: string;
  departments: Department[];
  editing?: User | null;
};

export function CredentialsModal({
  open,
  cancelHref,
  departments,
  editing = null,
}: CredentialsModalProps) {
  const activeDepartments = departments.filter((row) => row.isActive);

  if (!editing) return null;

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={`Edit credentials — ${editing.fullName}`}
      titleId="credentials-modal-title"
      size="lg"
    >
      <form action={saveCredentialsAction} className="mt-5 space-y-4">
        <input type="hidden" name="id" value={editing.id} />

        <FormField label="Full name">
          <input
            name="full_name"
            required
            defaultValue={editing.fullName}
            className={inputClassName}
            autoFocus
          />
        </FormField>

        <FormField label="Username">
          <input
            name="username"
            required
            defaultValue={editing.username}
            className={inputClassName}
            autoComplete="off"
          />
        </FormField>

        <FormField label="New password (optional)">
          <input
            type="password"
            name="password"
            className={inputClassName}
            autoComplete="new-password"
            placeholder="Leave blank to keep current"
          />
        </FormField>

        <FormField label="Role">
          <select name="role" required defaultValue={editing.role} className={inputClassName}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department">
          <select
            name="department"
            defaultValue={editing.department ?? ""}
            className={inputClassName}
          >
            <option value="">— Select —</option>
            {activeDepartments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="HR scope">
          <select name="hr_scope" defaultValue={editing.hrScope ?? ""} className={inputClassName}>
            <option value="">— Select —</option>
            {HR_SCOPES.map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </select>
        </FormField>

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

        <FormModalFooter cancelHref={cancelHref} />
      </form>
    </FormModal>
  );
}
