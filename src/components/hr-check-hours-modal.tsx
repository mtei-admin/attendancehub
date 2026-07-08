"use client";

import { checkRequestAction } from "@/actions/hr";
import type { AttendanceRequest } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";

type HrCheckHoursModalProps = {
  open: boolean;
  onClose: () => void;
  request: AttendanceRequest;
};

export function HrCheckHoursModal({ open, onClose, request }: HrCheckHoursModalProps) {
  if (!open) return null;

  const hoursRequested = request.requestedOtHrs ?? request.otHrs ?? "";
  const hoursApprovedDefault = request.otHrs ?? request.requestedOtHrs ?? "";

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
          <dd className="font-medium text-slate-900">{hoursRequested || "—"}</dd>
        </div>
        {request.approvedBy && (
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Manager approved</dt>
            <dd className="font-medium text-slate-900">
              {request.otHrs || "—"} by {request.approvedBy}
            </dd>
          </div>
        )}
      </dl>

      <form action={checkRequestAction} className="mt-5 space-y-4">
        <input type="hidden" name="ref_id" value={request.refId} />

        <FormField label="Number of hours approved">
          <input
            type="text"
            name="approved_ot_hrs"
            required
            defaultValue={hoursApprovedDefault}
            placeholder="e.g. 2"
            className={inputClassName}
            autoFocus
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
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Mark as checked
          </button>
        </div>
      </form>
    </FormModal>
  );
}
