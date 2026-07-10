"use client";

import { useMemo, useState } from "react";

import { submitRequestAction } from "@/actions/requests";
import { REQUEST_TYPES } from "@/lib/constants";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";
import { OtHoursFields } from "./ot-hours-fields";

type EmployeeFormProps = {
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeForm({ companies, employeesByCompanyDepartment }: EmployeeFormProps) {
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [requestType, setRequestType] = useState("");

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

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
            onChange={(event) => setDepartment(event.target.value)}
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
          <input
            type="date"
            name="date_requested"
            defaultValue={todayIso()}
            required
            className={inputClassName}
          />
        </FormField>

        <FormField label="Employee name">
          <select
            name="employee_name"
            required
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
          </select>
        </FormField>

        <FormField label="Request type">
          <select
            name="request_type"
            required
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className={inputClassName}
          >
            <option value="">— Select type —</option>
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
            defaultValue={todayIso()}
            required
            className={inputClassName}
          />
        </FormField>

        {!showTimeFields ? null : (
          <>
            <FormField label="Actual time in">
              <input type="time" name="time_in" className={inputClassName} />
            </FormField>

            <FormField label="Actual time out">
              <input type="time" name="time_out" className={inputClassName} />
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
                  className="rounded border-slate-300 text-brand-600"
                />
                File as OT offset credit for future use
              </label>
            </div>

            <OtHoursFields
              hoursName="ot_hours"
              minutesName="ot_minutes"
              className="md:col-span-2"
            />
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
