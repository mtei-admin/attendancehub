"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { EmployeesByCompanyDepartment } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";

export type AdminSlipsFilters = {
  company: string;
  department: string;
  employee: string;
};

type AdminSlipsFilterBarProps = {
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  filters: AdminSlipsFilters;
  resultCount: number;
  totalCount: number;
};

export function AdminSlipsFilterBar({
  companies,
  employeesByCompanyDepartment,
  filters,
  resultCount,
  totalCount,
}: AdminSlipsFilterBarProps) {
  const [company, setCompany] = useState(filters.company);
  const [department, setDepartment] = useState(filters.department);
  const [employee, setEmployee] = useState(filters.employee);

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const isFiltered = Boolean(filters.company || filters.department || filters.employee);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <form method="get" className="space-y-4">
        <input type="hidden" name="tab" value="slips" />

        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Company">
            <select
              name="company"
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                setDepartment("");
                setEmployee("");
              }}
              className={inputClassName}
            >
              <option value="">Show all</option>
              {companies.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Department">
            <select
              name="department"
              value={department}
              disabled={!company}
              onChange={(event) => {
                setDepartment(event.target.value);
                setEmployee("");
              }}
              className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">{company ? "Show all" : "Select company first"}</option>
              {departments.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Employee">
            <select
              name="employee"
              value={employee}
              disabled={!company || !department}
              onChange={(event) => setEmployee(event.target.value)}
              className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">
                {company && department ? "Show all" : "Select department first"}
              </option>
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Apply
          </button>
          <Link
            href="/admin?tab=slips"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset Filters
          </Link>
          <p className="text-sm text-slate-500">
            {isFiltered
              ? `Showing ${resultCount} of ${totalCount} slip${totalCount === 1 ? "" : "s"}`
              : `Showing all ${totalCount} slip${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>
      </form>
    </div>
  );
}
