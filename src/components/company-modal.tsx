"use client";

import type { Company } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";

type CompanyModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  editing?: Company | null;
};

export function CompanyModal({
  open,
  cancelHref,
  saveAction,
  editing = null,
}: CompanyModalProps) {
  const isEditing = Boolean(editing);

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isEditing ? "Edit company" : "Add company"}
      titleId="company-modal-title"
    >
      <form action={saveAction} className="mt-5 space-y-4">
        {isEditing && editing && <input type="hidden" name="id" value={editing.id} />}

        <FormField label="Company name">
          <input
            name="name"
            required
            defaultValue={editing?.name ?? ""}
            className={inputClassName}
            placeholder="e.g. MTEI"
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
            Optional. Campfire chatbot lines URL for this company. When set, managers get a
            Basecamp ping when an employee submits a slip.
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
