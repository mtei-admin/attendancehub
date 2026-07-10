"use client";

import { useState } from "react";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";

type RejectRequestButtonLabels = {
  button?: string;
  title?: string;
  reasonLabel?: string;
  placeholder?: string;
  submit?: string;
  fieldName?: string;
  submitClassName?: string;
};

type RejectRequestButtonProps = {
  refId: string;
  action: (formData: FormData) => Promise<void>;
  variant?: "icon" | "link";
  hiddenFields?: Record<string, string>;
  labels?: RejectRequestButtonLabels;
};

const DEFAULT_REJECT_LABELS: Required<RejectRequestButtonLabels> = {
  button: "Reject",
  title: "Reject request",
  reasonLabel: "Reason",
  placeholder: "Provide a reason for rejecting this request",
  submit: "Reject",
  fieldName: "rejection_reason",
  submitClassName: "rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700",
};

export function RejectRequestButton({
  refId,
  action,
  variant = "link",
  hiddenFields = {},
  labels = {},
}: RejectRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const merged = { ...DEFAULT_REJECT_LABELS, ...labels };
  const isReturn = merged.fieldName === "hr_return_reason";

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          className={
            isReturn
              ? "inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-white text-sm font-bold text-amber-700 hover:bg-amber-50"
              : "inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-bold text-red-600 hover:bg-red-50"
          }
          title={merged.button}
          onClick={() => setOpen(true)}
        >
          {isReturn ? "↩" : "✕"}
        </button>
      ) : (
        <button
          type="button"
          className={
            isReturn
              ? "text-xs font-semibold text-amber-700 underline hover:text-amber-800"
              : "text-xs font-semibold text-red-600 underline hover:text-red-700"
          }
          onClick={() => setOpen(true)}
        >
          {merged.button}
        </button>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title={merged.title}
        titleId={`reject-request-${refId}`}
      >
        <form
          action={action}
          className="mt-5 space-y-4"
          onSubmit={() => setOpen(false)}
        >
          <input type="hidden" name="ref_id" value={refId} />
          {Object.entries(hiddenFields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}

          <FormField label={merged.reasonLabel}>
            <textarea
              name={merged.fieldName}
              required
              rows={3}
              className={inputClassName}
              placeholder={merged.placeholder}
              autoFocus
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className={merged.submitClassName}>
              {merged.submit}
            </button>
          </div>
        </form>
      </FormModal>
    </>
  );
}

export const HR_RETURN_BUTTON_LABELS: RejectRequestButtonLabels = {
  button: "Return",
  title: "Return to manager",
  reasonLabel: "Reason for return",
  placeholder: "Explain why this slip is being returned for re-evaluation",
  submit: "Return",
  fieldName: "hr_return_reason",
  submitClassName:
    "rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700",
};
