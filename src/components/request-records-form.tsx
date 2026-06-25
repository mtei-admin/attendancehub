"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { requestRecordsAction } from "@/actions/records";
import { REQUEST_TYPES, STATUSES } from "@/lib/constants";
import { employeeLookupKey } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";

type RequestRecordsFormProps = {
  companies: string[];
  employeesByCompanyDepartment: Record<string, Record<string, string[]>>;
  employeeEmails: Record<string, string | null>;
  smtpConfigured: boolean;
};

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={!canSubmit || pending}
      className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Sending records…" : "Send records to my email"}
    </button>
  );
}

export function RequestRecordsForm({
  companies,
  employeesByCompanyDepartment,
  employeeEmails,
  smtpConfigured,
}: RequestRecordsFormProps) {
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeName, setEmployeeName] = useState("");

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
  const canSubmit = Boolean(company && department && employeeName);

  return (
    <form
      action={requestRecordsAction}
      className="space-y-5 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Request my records</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select your name and filters. Matching records will be emailed to the address on file in
          the employee roster. Filter is based on <strong>date submitted</strong>.
        </p>
      </div>

      {!smtpConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Email delivery is not configured on the server yet. Please contact HR or IT before
          requesting records.
        </div>
      )}

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
          No email is on file for this employee. Please proceed to HR to add or update your email on
          the roster before requesting records.
        </div>
      )}

      {selectedEmail?.trim() && (
        <p className="text-sm text-slate-600">
          Records will be sent to the email on file for this employee.
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Date submitted from">
          <input
            type="date"
            name="submitted_from"
            required
            defaultValue={defaultFromDate()}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Date submitted to">
          <input
            type="date"
            name="submitted_to"
            required
            defaultValue={todayIso()}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Request type">
          <select name="request_type" defaultValue="" className={inputClassName}>
            <option value="">All types</option>
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Status">
          <select name="status" defaultValue="" className={inputClassName}>
            <option value="">All statuses</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {!canSubmit && (
        <p className="text-sm text-slate-500">
          Select company, department, and employee name to enable sending.
        </p>
      )}

      <SubmitButton canSubmit={canSubmit && smtpConfigured && !missingEmail} />
    </form>
  );
}
