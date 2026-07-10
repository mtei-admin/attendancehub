"use client";

import { useRef, useState } from "react";

import { saveOtManualOverrideAction } from "@/actions/hr";
import { formatOtHoursLabel } from "@/lib/ot-hours";
import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";

type OverrideType = "add" | "deduct";

type OtManualOverrideModalProps = {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  slipHoursTotal: number;
  existingOverrideHours: number;
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

function parsePositiveHours(hoursRaw: string, minutesRaw: string): number | null {
  const hours = hoursRaw.trim();
  const minutes = minutesRaw.trim();
  if (!hours && !minutes) return null;

  if (hours && !/^\d+$/.test(hours)) return null;
  if (minutes && !/^\d+$/.test(minutes)) return null;

  const hoursValue = hours ? Number.parseInt(hours, 10) : 0;
  const minutesValue = minutes ? Number.parseInt(minutes, 10) : 0;

  if (minutesValue < 0 || minutesValue > 59) return null;
  if (hoursValue === 0 && minutesValue === 0) return null;

  return hoursValue + minutesValue / 60;
}

export function OtManualOverrideModal({
  open,
  onClose,
  employeeName,
  slipHoursTotal,
  existingOverrideHours,
  contextFields,
}: OtManualOverrideModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [overrideType, setOverrideType] = useState<OverrideType>("add");
  const [confirmDeduct, setConfirmDeduct] = useState(false);
  const [deductHours, setDeductHours] = useState(0);
  const [projectedTotal, setProjectedTotal] = useState(0);

  if (!open) return null;

  function resetConfirm() {
    setConfirmDeduct(false);
    setDeductHours(0);
    setProjectedTotal(0);
  }

  function handleClose() {
    resetConfirm();
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (overrideType !== "deduct" || confirmDeduct) {
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const hoursRaw = String(formData.get("override_hours") ?? "");
    const minutesRaw = String(formData.get("override_minutes") ?? "");
    const amount = parsePositiveHours(hoursRaw, minutesRaw);

    if (amount === null || amount <= 0) {
      return;
    }

    const currentTotal = slipHoursTotal + existingOverrideHours;
    const nextTotal = currentTotal - amount;

    setDeductHours(amount);
    setProjectedTotal(nextTotal);
    setConfirmDeduct(true);
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={`Manual OT override — ${employeeName}`}
      titleId="ot-manual-override-modal-title"
      size="md"
    >
      <p className="mt-2 text-sm text-slate-500">
        Adjust this employee&apos;s total OT for the selected Confi cutoff period. HR-checked export
        only.
      </p>

      {confirmDeduct ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Confirm deduction</p>
            <p className="mt-2">
              Deduct <strong>{formatOtHoursLabel(deductHours)}</strong> from{" "}
              <strong>{employeeName}</strong>?
            </p>
            <ul className="mt-3 space-y-1 text-amber-800">
              <li>Slip total: {slipHoursTotal.toFixed(2)} hrs</li>
              <li>Existing override balance: {existingOverrideHours.toFixed(2)} hrs</li>
              <li>
                Projected total OT:{" "}
                <strong className={projectedTotal < 0 ? "text-red-700" : ""}>
                  {projectedTotal.toFixed(2)} hrs
                </strong>
              </li>
            </ul>
            {projectedTotal < 0 && (
              <p className="mt-2 font-medium text-red-700">
                This will make total OT hours negative. Confirm only if that is intended.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={resetConfirm}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Confirm deduct
            </button>
          </div>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={saveOtManualOverrideAction}
        className={`mt-5 space-y-4 ${confirmDeduct ? "hidden" : ""}`}
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="ot_group" value={contextFields.payrollGroup} />
        <input type="hidden" name="ot_basis" value={contextFields.exportBasis} />
        <input type="hidden" name="ot_period" value={contextFields.periodId} />
        <input type="hidden" name="ot_start" value={contextFields.startDate} />
        <input type="hidden" name="ot_end" value={contextFields.endDate} />
        <input type="hidden" name="ot_custom" value={contextFields.useCustomRange ? "1" : "0"} />
        <input type="hidden" name="ot_company" value={contextFields.company} />
        <input type="hidden" name="ot_department" value={contextFields.department} />
        <input type="hidden" name="ot_employee" value={employeeName} />
        <input type="hidden" name="override_type" value={overrideType} />

        <FormField label="Override type">
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="override_type_choice"
                value="add"
                checked={overrideType === "add"}
                onChange={() => setOverrideType("add")}
                className="text-brand-600"
              />
              Add
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="override_type_choice"
                value="deduct"
                checked={overrideType === "deduct"}
                onChange={() => setOverrideType("deduct")}
                className="text-brand-600"
              />
              Deduct
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Add increases total OT hours. Deduct subtracts from total OT hours for this cutoff.
          </p>
        </FormField>

        <OtHoursFields
          label={overrideType === "add" ? "Hours to add" : "Hours to deduct"}
          hoursName="override_hours"
          minutesName="override_minutes"
          required
        />

        <FormField label="Remarks / notes">
          <textarea
            name="note"
            rows={3}
            required
            placeholder="Reason for manual override..."
            className={inputClassName}
          />
        </FormField>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>Slip total: {slipHoursTotal.toFixed(2)} hrs</p>
          <p className="mt-1">Existing override balance: {existingOverrideHours.toFixed(2)} hrs</p>
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={
              overrideType === "deduct"
                ? "rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                : "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            }
          >
            {overrideType === "add" ? "Save" : "Review deduct"}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
