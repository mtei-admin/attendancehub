"use client";

import { useRef, useState } from "react";

import { saveOtOffsetBalanceOverrideAction } from "@/actions/hr";
import { formatOtHoursLabel } from "@/lib/ot-hours";
import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";

type OverrideType = "add" | "deduct";

type OtOffsetBalanceOverrideModalProps = {
  open: boolean;
  onClose: () => void;
  employeeName: string;
  currentBalance: number;
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

export function OtOffsetBalanceOverrideModal({
  open,
  onClose,
  employeeName,
  currentBalance,
  contextFields,
}: OtOffsetBalanceOverrideModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const allowSubmitRef = useRef(false);
  const [overrideType, setOverrideType] = useState<OverrideType>("add");
  const [confirmDeduct, setConfirmDeduct] = useState(false);
  const [deductHours, setDeductHours] = useState(0);
  const [projectedBalance, setProjectedBalance] = useState(0);
  const [clientError, setClientError] = useState<string | null>(null);

  if (!open) return null;

  function resetConfirm() {
    allowSubmitRef.current = false;
    setConfirmDeduct(false);
    setDeductHours(0);
    setProjectedBalance(0);
    setClientError(null);
  }

  function handleClose() {
    resetConfirm();
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (allowSubmitRef.current) {
      allowSubmitRef.current = false;
      return;
    }

    if (overrideType !== "deduct") {
      const formData = new FormData(event.currentTarget);
      const amount = parsePositiveHours(
        String(formData.get("override_hours") ?? ""),
        String(formData.get("override_minutes") ?? ""),
      );
      if (amount === null || amount <= 0) {
        event.preventDefault();
        setClientError("Enter hours and/or minutes greater than zero.");
        return;
      }
      const note = String(formData.get("note") ?? "").trim();
      if (!note) {
        event.preventDefault();
        setClientError("Remarks / notes are required.");
        return;
      }
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const amount = parsePositiveHours(
      String(formData.get("override_hours") ?? ""),
      String(formData.get("override_minutes") ?? ""),
    );

    if (amount === null || amount <= 0) {
      setClientError("Enter hours and/or minutes greater than zero.");
      return;
    }

    const note = String(formData.get("note") ?? "").trim();
    if (!note) {
      setClientError("Remarks / notes are required.");
      return;
    }

    setClientError(null);
    setDeductHours(amount);
    setProjectedBalance(currentBalance - amount);
    setConfirmDeduct(true);
  }

  function handleConfirmDeduct() {
    allowSubmitRef.current = true;
    formRef.current?.requestSubmit();
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={`Offset balance override — ${employeeName}`}
      titleId="ot-offset-balance-override-modal-title"
      size="md"
    >
      <p className="mt-2 text-sm text-slate-500">
        Adjust this employee&apos;s lifetime Available OT Offset Balance. This is separate from
        period OT hours.
      </p>

      {confirmDeduct ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Confirm deduction</p>
            <p className="mt-2">
              Deduct <strong>{formatOtHoursLabel(deductHours)}</strong> from{" "}
              <strong>{employeeName}</strong>&apos;s offset balance?
            </p>
            <ul className="mt-3 space-y-1 text-amber-800">
              <li>Current balance: {currentBalance.toFixed(2)} hrs</li>
              <li>
                Projected balance:{" "}
                <strong className={projectedBalance < 0 ? "text-red-700" : ""}>
                  {Math.max(0, projectedBalance).toFixed(2)} hrs
                </strong>
                {projectedBalance < 0 ? " (floored at 0 for available balance)" : ""}
              </li>
            </ul>
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
              onClick={handleConfirmDeduct}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Confirm deduct
            </button>
          </div>
        </div>
      ) : null}

      <form
        ref={formRef}
        action={saveOtOffsetBalanceOverrideAction}
        className={`mt-5 space-y-4 ${confirmDeduct ? "sr-only" : ""}`}
        onSubmit={handleSubmit}
        aria-hidden={confirmDeduct}
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
                onChange={() => {
                  setOverrideType("add");
                  setClientError(null);
                }}
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
                onChange={() => {
                  setOverrideType("deduct");
                  setClientError(null);
                }}
                className="text-brand-600"
              />
              Deduct
            </label>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Changes lifetime Available OT Offset Balance (credits − OT Offset), not period OT.
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
            placeholder="Reason for offset balance override..."
            className={inputClassName}
          />
        </FormField>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p>Current Available OT Offset Balance: {currentBalance.toFixed(2)} hrs</p>
        </div>

        {clientError ? <p className="text-sm text-red-600">{clientError}</p> : null}

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
