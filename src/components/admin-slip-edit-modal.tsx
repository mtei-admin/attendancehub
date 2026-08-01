"use client";

import { useMemo, useState } from "react";

import { saveAdminSlipAction } from "@/actions/admin";
import { REQUEST_TYPES } from "@/lib/constants";
import { isConfiEmployee } from "@/lib/employee-portal";
import { splitStoredOtHours } from "@/lib/ot-hours";
import type { AttendanceRequest } from "@/lib/schema";
import {
  employeeLookupKey,
  type EmployeesByCompanyDepartment,
} from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";
import { PendingSubmitButton } from "./pending-submit-button";

type AdminSlipEditModalProps = {
  open: boolean;
  cancelHref: string;
  request: AttendanceRequest | null;
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  employeeTypeLookup: Record<string, string>;
};

function formatWorkflowStatus(request: AttendanceRequest): string {
  if (request.archived) return "HR checked";
  if (request.status === "Approved") return "Approved — pending HR check";
  if (request.status === "Rejected") return "Rejected";
  if (request.verifiedOn) return "Verified — pending manager approval";
  return "Pending verification";
}

export function AdminSlipEditModal({
  open,
  cancelHref,
  request,
  companies,
  employeesByCompanyDepartment,
  employeeTypeLookup,
}: AdminSlipEditModalProps) {
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
      titleId="admin-slip-edit-modal-title"
      size="xl"
    >
      <AdminSlipEditForm
        request={request}
        companies={companies}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
        employeeTypeLookup={employeeTypeLookup}
        reasonWithoutPrefix={reasonWithoutPrefix}
        isOtOffsetDefault={isOtOffset}
        otDefaults={otDefaults}
        cancelHref={cancelHref}
      />
    </FormModal>
  );
}

function AdminSlipEditForm({
  request,
  companies,
  employeesByCompanyDepartment,
  employeeTypeLookup,
  reasonWithoutPrefix,
  isOtOffsetDefault,
  otDefaults,
  cancelHref,
}: {
  request: AttendanceRequest;
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  employeeTypeLookup: Record<string, string>;
  reasonWithoutPrefix: string;
  isOtOffsetDefault: boolean;
  otDefaults: { hours: string; minutes: string };
  cancelHref: string;
}) {
  const [company, setCompany] = useState(request.company ?? companies[0] ?? "");
  const [department, setDepartment] = useState(request.department ?? "");
  const [employeeName, setEmployeeName] = useState(request.employeeName);
  const [requestType, setRequestType] = useState(request.requestType);

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const employeeType =
    employeeTypeLookup[employeeLookupKey(company, department, employeeName)] ?? null;
  const showOtOffsetOption = isConfiEmployee(employeeType);

  const isOtOrHolidayWork =
    requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
  const isOtOffsetRequest = requestType === "OT Offset";
  // Absent/Leave stays date-only; OT Offset shows From/To like the employee portal.
  const showTimeFields = requestType !== "Absent/Leave";
  const timeInLabel = isOtOffsetRequest ? "From" : "Actual time in";
  const timeOutLabel = isOtOffsetRequest ? "To" : "Actual time out";

  return (
    <form action={saveAdminSlipAction} className="mt-5 space-y-4">
      <input type="hidden" name="ref_id" value={request.refId} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Workflow:</span>{" "}
          {formatWorkflowStatus(request)}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-slate-800">Record status:</span> {request.status}
          {request.submittedBy ? ` · Filed by ${request.submittedBy}` : ""}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Company">
          <select
            name="company"
            required
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setDepartment("");
              setEmployeeName("");
            }}
            className={inputClassName}
          >
            {companies.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {request.company && !companies.includes(request.company) && (
              <option value={request.company}>{request.company}</option>
            )}
          </select>
        </FormField>

        <FormField label="Department">
          <select
            name="department"
            required
            value={department}
            disabled={!company}
            onChange={(event) => {
              setDepartment(event.target.value);
              setEmployeeName("");
            }}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">— Select department —</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
            {request.department && !departments.includes(request.department) && (
              <option value={request.department}>{request.department}</option>
            )}
          </select>
        </FormField>

        <FormField label="Employee name">
          <select
            name="employee_name"
            required
            value={employeeName}
            disabled={!department}
            onChange={(event) => setEmployeeName(event.target.value)}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">
              {department ? "— Select employee —" : "Select department first"}
            </option>
            {employees.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            {!employees.includes(request.employeeName) && request.employeeName && (
              <option value={request.employeeName}>{request.employeeName}</option>
            )}
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

        <FormField label="Request type" className="md:col-span-2">
          <select
            name="request_type"
            required
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className={inputClassName}
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
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
            <FormField label={timeInLabel}>
              <input
                type="time"
                name="time_in"
                defaultValue={request.timeIn ?? ""}
                className={inputClassName}
              />
            </FormField>

            <FormField label={timeOutLabel}>
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
            {showOtOffsetOption ? (
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
            ) : null}

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
            defaultValue={showOtOffsetOption ? reasonWithoutPrefix : (request.reason ?? "")}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Verification note" className="md:col-span-2">
          <textarea
            name="verification_note"
            rows={2}
            defaultValue={request.verificationNote ?? ""}
            placeholder="Optional verifier note..."
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
        <PendingSubmitButton
          pendingLabel="Saving…"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Save changes
        </PendingSubmitButton>
      </div>
    </form>
  );
}
