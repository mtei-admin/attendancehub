"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { requestRecordsAction, viewRecordsAction } from "@/actions/records";
import { REQUEST_TYPES, STATUSES } from "@/lib/constants";
import { employeeLookupKey } from "@/lib/roster";
import type { AttendanceRequest } from "@/lib/schema";
import type { RecordRequestFilters } from "@/lib/record-requests";

import { EmployeeRecordsList } from "./employee-records-list";
import { FormField, inputClassName } from "./form-field";
import { RecordsViewSession } from "./records-view-session";

type MyRecordsSectionProps = {
  companies: string[];
  employeesByCompanyDepartment: Record<string, Record<string, string[]>>;
  employeeEmails: Record<string, string | null>;
  smtpConfigured: boolean;
  records: AttendanceRequest[];
  activeRecordView?: { filters: RecordRequestFilters; viewedAt: number };
  editRefId?: string;
  employeeType?: string;
  availableOtOffsetBalance?: number | null;
};

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ActionButton({
  label,
  pendingLabel,
  disabled,
  formAction,
  variant = "primary",
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  const className =
    variant === "primary"
      ? "rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={disabled || pending}
      className={className}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function buildExportUrl(filters: RecordRequestFilters): string {
  const params = new URLSearchParams({
    company: filters.company,
    department: filters.department,
    employee_name: filters.employeeName,
    submitted_from: filters.submittedFrom,
    submitted_to: filters.submittedTo,
  });
  if (filters.requestType) params.set("request_type", filters.requestType);
  if (filters.status) params.set("status", filters.status);
  return `/api/export/employee-records?${params.toString()}`;
}

export function MyRecordsSection({
  companies,
  employeesByCompanyDepartment,
  employeeEmails,
  smtpConfigured,
  records,
  activeRecordView,
  editRefId,
  employeeType,
  availableOtOffsetBalance,
}: MyRecordsSectionProps) {
  const activeFilters = activeRecordView?.filters;
  const [company, setCompany] = useState(activeFilters?.company ?? "");
  const [department, setDepartment] = useState(activeFilters?.department ?? "");
  const [employeeName, setEmployeeName] = useState(activeFilters?.employeeName ?? "");

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const selectedEmail =
    company && department && employeeName
      ? employeeEmails[employeeLookupKey(company, department, employeeName)]
      : null;

  const missingEmail = Boolean(employeeName && !selectedEmail?.trim());
  const canQuery = Boolean(company && department && employeeName);
  const canEmail = canQuery && smtpConfigured && !missingEmail;

  const filterFields = (
    <>
      {company && <input type="hidden" name="company" value={company} />}
      {department && <input type="hidden" name="department" value={department} />}
      {employeeName && <input type="hidden" name="employee_name" value={employeeName} />}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Company">
          <select
            required
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setDepartment("");
              setEmployeeName("");
            }}
            className={inputClassName}
          >
            <option value="">— Select company —</option>
            {companies.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Department">
          <select
            required
            value={department}
            disabled={!company}
            onChange={(event) => {
              setDepartment(event.target.value);
              setEmployeeName("");
            }}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">
              {company ? "— Select department —" : "Select company first"}
            </option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Employee name">
          <select
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
          </select>
        </FormField>
      </div>

      {missingEmail && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No email is on file for this employee. You can still view records here; contact HR to add
          an email before using email delivery.
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Date submitted from">
          <input
            type="date"
            name="submitted_from"
            required
            defaultValue={activeFilters?.submittedFrom ?? defaultFromDate()}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Date submitted to">
          <input
            type="date"
            name="submitted_to"
            required
            defaultValue={activeFilters?.submittedTo ?? todayIso()}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Request type">
          <select
            name="request_type"
            defaultValue={activeFilters?.requestType ?? ""}
            className={inputClassName}
          >
            <option value="">All types</option>
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Status">
          <select
            name="status"
            defaultValue={activeFilters?.status ?? ""}
            className={inputClassName}
          >
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </>
  );

  return (
    <div className="space-y-6 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">My records</h2>
        <p className="mt-1 text-sm text-slate-500">
          View your attendance requests in the portal or email a CSV copy. Filter is based on{" "}
          <strong>date submitted</strong>. Pending, unverified requests can be edited.
        </p>
      </div>

      {!smtpConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Email delivery is not configured on the server. You can still view and download records
          below.
        </div>
      )}

      <form action={viewRecordsAction} className="space-y-5">
        {filterFields}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <ActionButton
            label="View records"
            pendingLabel="Loading records…"
            disabled={!canQuery}
          />
          <ActionButton
            label="Send record to email"
            pendingLabel="Sending records…"
            disabled={!canEmail}
            formAction={requestRecordsAction}
            variant="secondary"
          />
        </div>

        {selectedEmail?.trim() && (
          <p className="text-right text-sm text-slate-600">
            Email will be sent to the address on file for this employee.
          </p>
        )}
      </form>

      {activeRecordView && (
        <RecordsViewSession
          filters={activeRecordView.filters}
          viewedAt={activeRecordView.viewedAt}
          editRefId={editRefId}
        >
          <EmployeeRecordsList
            records={records}
            filters={activeRecordView.filters}
            viewedAt={activeRecordView.viewedAt}
            editRefId={editRefId}
            exportUrl={buildExportUrl(activeRecordView.filters)}
            employeeType={employeeType}
            availableOtOffsetBalance={availableOtOffsetBalance}
          />
        </RecordsViewSession>
      )}
    </div>
  );
}
