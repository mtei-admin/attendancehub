"use client";

import { useEffect, useMemo, useState } from "react";

import { updateEmployeeRecordAction } from "@/actions/records";
import {
  employeePortalRequestTypes,
  showEmployeePortalTimeFields,
  showOtOffsetCreditCheckbox,
} from "@/lib/employee-portal";
import type { RecordRequestFilters } from "@/lib/record-requests";
import type { AttendanceRequest } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";

type EmployeeRecordEditModalProps = {
  open: boolean;
  request: AttendanceRequest | null;
  filters: RecordRequestFilters;
  cancelHref: string;
  employeeType?: string;
};

export function EmployeeRecordEditModal({
  open,
  request,
  filters,
  cancelHref,
  employeeType,
}: EmployeeRecordEditModalProps) {
  if (!open || !request) return null;

  const reasonDefault = request.reason ?? "";
  const isOtOffset = reasonDefault.startsWith("[OT offset credit]");
  const reasonWithoutPrefix = isOtOffset
    ? reasonDefault.replace(/^\[OT offset credit\]\s*/, "")
    : reasonDefault;

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={`Edit request ${request.refId}`}
      titleId="employee-record-edit-modal-title"
      size="xl"
    >
      <EmployeeRecordEditForm
        request={request}
        filters={filters}
        reasonWithoutPrefix={reasonWithoutPrefix}
        isOtOffsetDefault={isOtOffset}
        cancelHref={cancelHref}
        employeeType={employeeType}
      />
    </FormModal>
  );
}

function EmployeeRecordEditForm({
  request,
  filters,
  reasonWithoutPrefix,
  isOtOffsetDefault,
  cancelHref,
  employeeType,
}: {
  request: AttendanceRequest;
  filters: RecordRequestFilters;
  reasonWithoutPrefix: string;
  isOtOffsetDefault: boolean;
  cancelHref: string;
  employeeType?: string;
}) {
  const [requestType, setRequestType] = useState(request.requestType);

  const availableRequestTypes = useMemo(
    () => employeePortalRequestTypes(employeeType),
    [employeeType],
  );

  useEffect(() => {
    if (requestType && !availableRequestTypes.includes(requestType)) {
      setRequestType(availableRequestTypes[0] ?? "");
    }
  }, [availableRequestTypes, requestType]);

  const showTimeFields = showEmployeePortalTimeFields(requestType);
  const isOtOrHolidayWork =
    requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
  const showOtOffsetCheckbox = showOtOffsetCreditCheckbox(employeeType, requestType);

  return (
    <form action={updateEmployeeRecordAction} className="mt-5 space-y-4">
      <input type="hidden" name="ref_id" value={request.refId} />
      <input type="hidden" name="company" value={filters.company} />
      <input type="hidden" name="department" value={filters.department} />
      <input type="hidden" name="employee_name" value={filters.employeeName} />
      <input type="hidden" name="submitted_from" value={filters.submittedFrom} />
      <input type="hidden" name="submitted_to" value={filters.submittedTo} />
      {filters.requestType && (
        <input type="hidden" name="filter_request_type" value={filters.requestType} />
      )}
      {filters.status && <input type="hidden" name="filter_status" value={filters.status} />}

      <p className="text-sm text-slate-500">
        Only pending, unverified requests can be edited. Approved and HR-checked records are
        read-only.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Request type" className="md:col-span-2">
          <select
            name="request_type"
            required
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className={inputClassName}
          >
            {availableRequestTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date requested">
          <input
            type="date"
            name="date_requested"
            defaultValue={request.dateRequested ?? ""}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Date of application">
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

        {isOtOrHolidayWork && (
          <FormField label="Hours to claim" className="md:col-span-2">
            <input
              type="text"
              name="ot_hrs"
              defaultValue={request.otHrs ?? ""}
              placeholder="e.g. 2"
              className={inputClassName}
            />
          </FormField>
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
