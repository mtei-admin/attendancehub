"use client";

import { useMemo, useState } from "react";

import type { Department } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";

type CompanyDepartmentFieldsProps = {
  departments: Department[];
  companies: string[];
  defaultCompany?: string;
  defaultDepartmentName?: string;
  defaultDepartmentId?: number;
  departmentMode?: "name" | "id";
  requireCompany?: boolean;
};

export function CompanyDepartmentFields({
  departments,
  companies,
  defaultCompany = "",
  defaultDepartmentName = "",
  defaultDepartmentId,
  departmentMode = "name",
  requireCompany = true,
}: CompanyDepartmentFieldsProps) {
  const activeDepartments = departments.filter((row) => row.isActive);
  const [company, setCompany] = useState(defaultCompany);

  const companyOptions = useMemo(() => {
    const fromDepartments = new Set(activeDepartments.map((row) => row.company));
    return Array.from(new Set([...companies, ...fromDepartments])).sort();
  }, [activeDepartments, companies]);

  const filteredDepartments = useMemo(() => {
    if (!company) return [];
    return activeDepartments.filter((row) => row.company === company);
  }, [activeDepartments, company]);

  return (
    <>
      <FormField label="Company">
        <select
          name="company"
          required={requireCompany}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          className={inputClassName}
        >
          <option value="">— Select —</option>
          {companyOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Department">
        {departmentMode === "id" ? (
          <select
            name="department_id"
            required
            defaultValue={defaultDepartmentId ?? ""}
            disabled={!company}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">{company ? "— Select —" : "Select company first"}</option>
            {filteredDepartments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            name="department"
            required
            defaultValue={defaultDepartmentName}
            disabled={!company}
            className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <option value="">{company ? "— Select —" : "Select company first"}</option>
            {filteredDepartments.map((department) => (
              <option key={department.id} value={department.name}>
                {department.name}
              </option>
            ))}
          </select>
        )}
      </FormField>
    </>
  );
}
