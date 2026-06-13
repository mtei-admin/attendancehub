"use client";

import type { Department } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";

type DepartmentModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  editing?: Department | null;
};

export function DepartmentModal({
  open,
  cancelHref,
  saveAction,
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
