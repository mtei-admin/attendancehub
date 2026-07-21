"use client";

import { DEFAULT_COMPANY } from "@/lib/constants";
import type { Department } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";

type DepartmentModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  companies: string[];
  editing?: Department | null;
};

export function DepartmentModal({
  open,
  cancelHref,
  saveAction,
  companies,
  editing = null,
}: DepartmentModalProps) {
  const isEditing = Boolean(editing);

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isEditing ? "Edit department" : "Add department"}
      titleId="department-modal-title"
    >
      <form action={saveAction} className="mt-5 space-y-4">
        {isEditing && editing && <input type="hidden" name="id" value={editing.id} />}

        <FormField label="Company">
          <select
            name="company"
            required
            defaultValue={editing?.company ?? DEFAULT_COMPANY}
            className={inputClassName}
          >
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department name">
          <input
            name="name"
            required
            defaultValue={editing?.name ?? ""}
            className={inputClassName}
            placeholder="e.g. Operations"
            autoFocus
          />
        </FormField>

        <FormField label="Basecamp chatbot URL">
          <input
            name="basecamp_webhook_url"
            type="url"
            defaultValue={editing?.basecampWebhookUrl ?? ""}
            className={inputClassName}
            placeholder="https://3.basecampapi.com/.../lines.json"
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Optional. Preferred Campfire for this department. If empty, the company URL is used.
          </p>
        </FormField>

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
