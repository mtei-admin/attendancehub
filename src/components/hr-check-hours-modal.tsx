"use client";

import { checkRequestAction } from "@/actions/hr";
import { splitStoredOtHours, formatOtHoursLabel } from "@/lib/ot-hours";
import { parseOtHours } from "@/lib/ot-summary";
import type { AttendanceRequest } from "@/lib/schema";

import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";

type HrCheckHoursModalProps = {
  open: boolean;
  onClose: () => void;
  request: AttendanceRequest;
};

function formatStoredOtHours(value: string | null | undefined): string {
  const parsed = parseOtHours(value ?? null);
  if (!parsed.valid || parsed.hours <= 0) return "—";
  return formatOtHoursLabel(parsed.hours);
}

export function HrCheckHoursModal({ open, onClose, request }: HrCheckHoursModalProps) {
  if (!open) return null;

  const hoursRequested = request.requestedOtHrs ?? request.otHrs ?? "";
  const hoursApprovedDefault = request.otHrs ?? request.requestedOtHrs ?? "";
  const approvedDefaults = splitStoredOtHours(hoursApprovedDefault);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={`Confirm hours — ${request.refId}`}
      titleId="hr-check-hours-modal-title"
      size="md"
    >
      <p className="mt-2 text-sm text-slate-500">
        Confirm the number of hours approved before marking this Confi request as HR-checked.
      </p>

      <dl className="mt-4 grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Employee</dt>
          <dd className="font-medium text-slate-900">{request.employeeName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Type</dt>
          <dd className="font-medium text-slate-900">{request.requestType}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Incident date</dt>
          <dd className="font-medium text-slate-900">{request.dateOfIncident}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Hours requested</dt>
          <dd className="font-medium text-slate-900">{formatStoredOtHours(hoursRequested)}</dd>
        </div>
        {request.approvedBy && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Manager approved</dt>
            <dd className="font-medium text-slate-900">
              {formatStoredOtHours(request.otHrs)} by {request.approvedBy}
            </dd>
          </div>
        )}
      </dl>

      <form action={checkRequestAction} className="mt-5 space-y-4">
        <input type="hidden" name="ref_id" value={request.refId} />

        <OtHoursFields
          label="Number of hours approved"
          hoursName="approved_ot_hours"
          minutesName="approved_ot_minutes"
          defaultHours={approvedDefaults.hours}
          defaultMinutes={approvedDefaults.minutes}
          required
        />

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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Mark as checked
          </button>
        </div>
      </form>
    </FormModal>
  );
}
