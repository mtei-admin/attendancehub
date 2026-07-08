"use client";

import { saveOtManualOverrideAction } from "@/actions/hr";
import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";

type OtManualOverrideModalProps = {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  contextFields: {
    payrollGroup: string;
    exportBasis: string;
    periodId: string;
    startDate: string;
    endDate: string;
    useCustomRange: boolean;
    company: string;
    department: string;
  };
};

export function OtManualOverrideModal({
  open,
  onClose,
  employeeName,
  contextFields,
}: OtManualOverrideModalProps) {
  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Manual OT override — ${employeeName}`}
      titleId="ot-manual-override-modal-title"
      size="md"
    >
      <p className="mt-2 text-sm text-slate-500">
        Adds hours to this employee&apos;s total OT for the selected Confi cutoff period. HR-checked
        export only.
      </p>

      <form action={saveOtManualOverrideAction} className="mt-5 space-y-4">
        <input type="hidden" name="ot_group" value={contextFields.payrollGroup} />
        <input type="hidden" name="ot_basis" value={contextFields.exportBasis} />
        <input type="hidden" name="ot_period" value={contextFields.periodId} />
        <input type="hidden" name="ot_start" value={contextFields.startDate} />
        <input type="hidden" name="ot_end" value={contextFields.endDate} />
        <input type="hidden" name="ot_custom" value={contextFields.useCustomRange ? "1" : "0"} />
        <input type="hidden" name="ot_company" value={contextFields.company} />
        <input type="hidden" name="ot_department" value={contextFields.department} />
        <input type="hidden" name="ot_employee" value={employeeName} />

        <FormField label="Number of hours">
          <input
            type="number"
            name="hours"
            required
            min="0.01"
            step="0.01"
            placeholder="e.g. 8"
            className={inputClassName}
            autoFocus
          />
        </FormField>

        <FormField label="Remarks / notes">
          <textarea
            name="note"
            rows={3}
            required
            placeholder="Reason for manual override..."
            className={inputClassName}
          />
        </FormField>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Save
          </button>
        </div>
      </form>
    </FormModal>
  );
}
