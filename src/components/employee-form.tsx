"use client";

import { useMemo, useState } from "react";

import { submitRequestAction } from "@/actions/requests";
import { REQUEST_TYPES } from "@/lib/constants";

import { FormField, inputClassName } from "./form-field";

type EmployeeFormProps = {
  departments: { id: number; name: string }[];
  employeesByDepartment: Record<string, string[]>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function EmployeeForm({ departments, employeesByDepartment }: EmployeeFormProps) {
  const [department, setDepartment] = useState("");

  const employees = useMemo(() => {
    if (!department) return [];
    return employeesByDepartment[department] ?? [];
  }, [department, employeesByDepartment]);

  return (
    <form
      action={submitRequestAction}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Department">
          <select
            name="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={inputClassName}
          >
            <option value="">— Select department —</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.name}>
                {dept.name}
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
          <select name="request_type" required className={inputClassName}>
            <option value="">— Select —</option>
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

        <FormField label="Actual time in">
          <input type="time" name="time_in" className={inputClassName} />
        </FormField>

        <FormField label="Actual time out">
          <input type="time" name="time_out" className={inputClassName} />
        </FormField>

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
