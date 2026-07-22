"use client";

import { useMemo, useState } from "react";

import { verifyRequestAction } from "@/actions/verification";
import { REQUEST_TYPES } from "@/lib/constants";
import type { AttendanceRequest } from "@/lib/schema";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";
import { isOwnSlip } from "@/lib/verification";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { PendingSubmitButton } from "./pending-submit-button";

type VerificationEditModalProps = {
  open: boolean;
  cancelHref: string;
  request: AttendanceRequest | null;
  verifierFullName: string;
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  scopeCompany: string;
  scopeDepartment?: string;
};

export function VerificationEditModal({
  open,
  cancelHref,
  request,
  verifierFullName,
  companies,
  employeesByCompanyDepartment,
  scopeCompany,
  scopeDepartment,
}: VerificationEditModalProps) {
  if (!open || !request) return null;

  const isOwnRequest = isOwnSlip(verifierFullName, request.employeeName);
  const reasonDefault = request.reason ?? "";
  const isOtOffset = reasonDefault.startsWith("[OT offset credit]");
  const reasonWithoutPrefix = isOtOffset
    ? reasonDefault.replace(/^\[OT offset credit\]\s*/, "")
    : reasonDefault;

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={`Verify request ${request.refId}`}
      titleId="verification-edit-modal-title"
      size="xl"
    >
      <VerificationEditForm
        request={request}
        verifierFullName={verifierFullName}
        companies={companies}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
        scopeCompany={scopeCompany}
        scopeDepartment={scopeDepartment}
        isOwnRequest={isOwnRequest}
        reasonWithoutPrefix={reasonWithoutPrefix}
        isOtOffsetDefault={isOtOffset}
        cancelHref={cancelHref}
      />
    </FormModal>
  );
}

type VerificationEditFormProps = {
  request: AttendanceRequest;
  verifierFullName: string;
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  scopeCompany: string;
  scopeDepartment?: string;
  isOwnRequest: boolean;
  reasonWithoutPrefix: string;
  isOtOffsetDefault: boolean;
  cancelHref: string;
};

function VerificationEditForm({
  request,
  companies,
  employeesByCompanyDepartment,
  scopeCompany,
  scopeDepartment,
  isOwnRequest,
  reasonWithoutPrefix,
  isOtOffsetDefault,
  cancelHref,
}: VerificationEditFormProps) {
  const initialCompany = request.company ?? scopeCompany;
  const initialDepartment = request.department ?? scopeDepartment ?? "";

  const [company, setCompany] = useState(initialCompany);
  const [department, setDepartment] = useState(initialDepartment);
  const [requestType, setRequestType] = useState(request.requestType);

  const companyOptions = useMemo(() => {
    return Array.from(new Set([scopeCompany, ...companies])).sort();
  }, [companies, scopeCompany]);

  const departments = useMemo(() => {
    if (!company) return [];
    const all = Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
    if (scopeDepartment) {
      return all.filter((dept) => dept === scopeDepartment);
    }
    return all;
  }, [company, employeesByCompanyDepartment, scopeDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const isSimpleLayout =
    requestType === "Absent/Leave" || requestType === "OT Offset";
  const isOtOrHolidayWork =
    requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
  const showTimeFields = !isSimpleLayout;

  return (
    <form action={verifyRequestAction} className="mt-5 space-y-4">
      <input type="hidden" name="ref_id" value={request.refId} />

      {isOwnRequest && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You cannot verify your own request.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Company">
          <select
            name="company"
            required
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setDepartment("");
            }}
            className={inputClassName}
          >
            {companyOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department">
          <select
            name="department"
            required
            value={department}
            disabled={!company}
            onChange={(event) => setDepartment(event.target.value)}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">— Select department —</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Date requested">
          <input
            type="date"
            name="date_requested"
            defaultValue={request.dateRequested ?? ""}
            required
            className={inputClassName}
          />
        </FormField>

        <FormField label="Employee name">
          <select
            name="employee_name"
            required
            defaultValue={request.employeeName}
            disabled={!department}
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
            <FormField label="Actual time in">
              <input
                type="time"
                name="time_in"
                defaultValue={request.timeIn ?? ""}
                className={inputClassName}
              />
            </FormField>

            <FormField label="Actual time out">
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

            <FormField label="Hours to claim" className="md:col-span-2">
              <input
                type="text"
                name="ot_hrs"
                defaultValue={request.otHrs ?? ""}
                placeholder="e.g. 2"
                className={inputClassName}
              />
            </FormField>
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

        <FormField label="Verification note (optional)" className="md:col-span-2">
          <textarea
            name="verification_note"
            rows={2}
            placeholder="Optional note for the approving manager..."
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
          pendingLabel="Verifying…"
          disabled={isOwnRequest}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verify request
        </PendingSubmitButton>
      </div>
    </form>
  );
}
