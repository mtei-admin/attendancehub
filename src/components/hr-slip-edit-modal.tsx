"use client";

import { useState } from "react";

import { saveHrSlipAction } from "@/actions/hr";
import {
  employeePortalRequestTypes,
  showEmployeePortalTimeFields,
  showOtOffsetCreditCheckbox,
} from "@/lib/employee-portal";
import { splitStoredOtHours } from "@/lib/ot-hours";
import type { AttendanceRequest } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";

type HrSlipEditModalProps = {
  open: boolean;
  cancelHref: string;
  request: AttendanceRequest | null;
  employeeType?: string;
  returnTab: string;
  returnPeriod?: string;
};

function formatWorkflowStatus(request: AttendanceRequest): string {
  if (request.archived) return "HR checked";
  return "Approved — pending HR check";
}

export function HrSlipEditModal({
  open,
  cancelHref,
  request,
  employeeType,
  returnTab,
  returnPeriod,
}: HrSlipEditModalProps) {
  if (!open || !request) return null;

  const reasonDefault = request.reason ?? "";
  const isOtOffset = reasonDefault.startsWith("[OT offset credit]");
  const reasonWithoutPrefix = isOtOffset
    ? reasonDefault.replace(/^\[OT offset credit\]\s*/, "")
    : reasonDefault;
  const otDefaults = splitStoredOtHours(request.otHrs ?? request.requestedOtHrs);

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={`Edit slip ${request.refId}`}
      titleId="hr-slip-edit-modal-title"
      size="xl"
    >
      <HrSlipEditForm
        request={request}
        employeeType={employeeType}
        reasonWithoutPrefix={reasonWithoutPrefix}
        isOtOffsetDefault={isOtOffset}
        otDefaults={otDefaults}
        cancelHref={cancelHref}
        returnTab={returnTab}
        returnPeriod={returnPeriod}
      />
    </FormModal>
  );
}

function HrSlipEditForm({
  request,
  employeeType,
  reasonWithoutPrefix,
  isOtOffsetDefault,
  otDefaults,
  cancelHref,
  returnTab,
  returnPeriod,
}: {
  request: AttendanceRequest;
  employeeType?: string;
  reasonWithoutPrefix: string;
  isOtOffsetDefault: boolean;
  otDefaults: { hours: string; minutes: string };
  cancelHref: string;
  returnTab: string;
  returnPeriod?: string;
}) {
  const [requestType, setRequestType] = useState(request.requestType);
  const requestTypes = employeePortalRequestTypes(employeeType);
  const showTimeFields = showEmployeePortalTimeFields(requestType);
  const isOtOrHolidayWork =
    requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
  const showOtOffsetCheckbox = showOtOffsetCreditCheckbox(employeeType, requestType);

  return (
    <form action={saveHrSlipAction} className="mt-5 space-y-4">
      <input type="hidden" name="ref_id" value={request.refId} />
      <input type="hidden" name="return_tab" value={returnTab} />
      {returnPeriod ? <input type="hidden" name="return_period" value={returnPeriod} /> : null}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Workflow:</span>{" "}
          {formatWorkflowStatus(request)}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-800">Employee:</span> {request.employeeName}
          {request.company ? ` · ${request.company}` : ""}
          {request.department ? ` · ${request.department}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Date requested">
          <input
            type="date"
            name="date_requested"
            defaultValue={request.dateRequested ?? ""}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Request type">
          <select
            name="request_type"
            required
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className={inputClassName}
          >
            {requestTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            {!requestTypes.includes(request.requestType) && (
              <option value={request.requestType}>{request.requestType}</option>
            )}
          </select>
        </FormField>

        <FormField label="Date of application" className="md:col-span-2">
          <input
            type="date"
            name="date_of_incident"
            defaultValue={request.dateOfIncident}
            required
            className={inputClassName}
          />
        </FormField>

        {showTimeFields && (
          <>
            <FormField label="From">
              <input
                type="time"
                name="time_in"
                defaultValue={request.timeIn ?? ""}
                className={inputClassName}
              />
            </FormField>

            <FormField label="To">
              <input
                type="time"
                name="time_out"
                defaultValue={request.timeOut ?? ""}
                className={inputClassName}
              />
            </FormField>
          </>
        )}

        {isOtOrHolidayWork && (
          <>
            {showOtOffsetCheckbox && (
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="file_as_ot_offset"
                    defaultChecked={isOtOffsetDefault}
                    className="rounded border-slate-300 text-brand-600"
                  />
                  File as OT offset credit for future use
                </label>
              </div>
            )}

            <OtHoursFields
              label="OT hours"
              hoursName="ot_hours"
              minutesName="ot_minutes"
              defaultHours={otDefaults.hours}
              defaultMinutes={otDefaults.minutes}
              className="md:col-span-2"
            />
          </>
        )}

        <FormField label="Reason / remarks" className="md:col-span-2">
          <textarea
            name="reason"
            rows={3}
            required
            defaultValue={reasonWithoutPrefix}
            className={inputClassName}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
        <a
          href={cancelHref}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </a>
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
