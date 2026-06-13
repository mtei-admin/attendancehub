"use client";

import { useState } from "react";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";

type RejectRequestButtonProps = {
  refId: string;
  action: (formData: FormData) => Promise<void>;
  variant?: "icon" | "link";
  hiddenFields?: Record<string, string>;
};

export function RejectRequestButton({
  refId,
  action,
  variant = "link",
  hiddenFields = {},
}: RejectRequestButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-white text-sm font-bold text-red-600 hover:bg-red-50"
          title="Reject"
          onClick={() => setOpen(true)}
        >
          ✕
        </button>
      ) : (
        <button
          type="button"
          className="text-xs font-semibold text-red-600 underline hover:text-red-700"
          onClick={() => setOpen(true)}
        >
          Reject
        </button>
      )}

      <FormModal
        open={open}
        onClose={() => setOpen(false)}
        title="Reject request"
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

          <FormField label="Reason">
            <textarea
              name="rejection_reason"
              required
              rows={3}
              className={inputClassName}
              placeholder="Provide a reason for rejecting this request"
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
            <button
              type="submit"
              className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </form>
      </FormModal>
    </>
  );
}
