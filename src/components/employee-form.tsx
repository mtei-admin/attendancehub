"use client";

import { useEffect, useMemo, useState } from "react";

import { submitRequestAction } from "@/actions/requests";
import {
  employeePortalRequestTypes,
  isOtOrHolidayWorkRequestType,
  showEmployeePortalTimeFields,
  showOtOffsetCreditCheckbox,
} from "@/lib/employee-portal";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";
import { employeeLookupKey } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";
import { OtHoursFields } from "./ot-hours-fields";
import { useOtHoursFromTimeRange } from "./use-ot-hours-from-time-range";

type EmployeeFormProps = {
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  employeeTypeLookup: Record<string, string>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeForm({
  companies,
  employeesByCompanyDepartment,
  employeeTypeLookup,
}: EmployeeFormProps) {
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [requestType, setRequestType] = useState("");
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const dateRequested = useMemo(() => todayIso(), []);

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const employeeType = useMemo(() => {
    if (!company || !department || !employeeName) return null;
    return employeeTypeLookup[employeeLookupKey(company, department, employeeName)] ?? null;
  }, [company, department, employeeName, employeeTypeLookup]);

  const availableRequestTypes = useMemo(
    () => employeePortalRequestTypes(employeeType),
    [employeeType],
  );

  useEffect(() => {
    if (requestType && !availableRequestTypes.includes(requestType)) {
      setRequestType("");
    }
  }, [availableRequestTypes, requestType]);

  const showTimeFields = showEmployeePortalTimeFields(requestType);
  const isOtOrHolidayWork = isOtOrHolidayWorkRequestType(requestType);
  const showOtOffsetCheckbox = showOtOffsetCreditCheckbox(employeeType, requestType);
  const otHoursFromTime = useOtHoursFromTimeRange(timeIn, timeOut, isOtOrHolidayWork);

  return (
    <form
      action={submitRequestAction}
      className="space-y-5 rounded-b-2xl border-0 bg-white p-6 shadow-none md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
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

        <FormField label="Date requested">
          <input type="hidden" name="date_requested" value={dateRequested} />
          <input
            type="date"
            value={dateRequested}
            disabled
            aria-disabled="true"
            className={`${inputClassName} cursor-not-allowed opacity-60`}
          />
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
          </select>
        </FormField>

        <FormField label="Request type">
          <select
            name="request_type"
            required
            value={requestType}
            onChange={(event) => setRequestType(event.target.value)}
            className={inputClassName}
          >
            <option value="">— Select type —</option>
            {availableRequestTypes.map((type) => (
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
            defaultValue={todayIso()}
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
                required
                value={timeIn}
                onChange={(event) => setTimeIn(event.target.value)}
                className={inputClassName}
              />
            </FormField>

            <FormField label="To">
              <input
                type="time"
                name="time_out"
                required
                value={timeOut}
                onChange={(event) => setTimeOut(event.target.value)}
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
                className="rounded border-slate-300 text-brand-600"
              />
              File as OT offset credit for future use
            </label>
          </div>
        )}

        {isOtOrHolidayWork && (
          <>
            <OtHoursFields
              hoursName="ot_hours"
              minutesName="ot_minutes"
              hoursValue={otHoursFromTime.hours}
              minutesValue={otHoursFromTime.minutes}
              readOnly
              required
              className="md:col-span-2"
            />
            {otHoursFromTime.error && (
              <p className="md:col-span-2 text-sm text-red-600">{otHoursFromTime.error}</p>
            )}
          </>
        )}

        <FormField label="Reason / remarks" className="md:col-span-2">
          <textarea
            name="reason"
            rows={4}
            required
            placeholder="Provide a brief explanation..."
            className={inputClassName}
          />
        </FormField>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
      >
        Submit request
      </button>
    </form>
  );
}
