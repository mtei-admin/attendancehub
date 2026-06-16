"use client";

import { EMPLOYEE_TYPES } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { EmployeeWithDepartment } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";
import { CompanyDepartmentFields } from "./company-department-fields";
import { getEmployeeTypeLabel } from "./manager-request-utils";

type EmployeeRosterModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  departments: Department[];
  companies: string[];
  editing?: EmployeeWithDepartment | null;
};

export function EmployeeRosterModal({
  open,
  cancelHref,
  saveAction,
  departments,
  companies,
  editing = null,
}: EmployeeRosterModalProps) {
  const isEditing = Boolean(editing);

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isEditing ? "Edit employee" : "Add employee"}
      titleId="employee-roster-modal-title"
    >
      <form action={saveAction} className="mt-5 space-y-4">
        {isEditing && editing && <input type="hidden" name="id" value={editing.id} />}

        <FormField label="Full name">
          <input
            name="full_name"
            required
            defaultValue={editing?.fullName ?? ""}
            className={inputClassName}
            placeholder="Employee name"
            autoFocus
          />
        </FormField>

        <CompanyDepartmentFields
          departments={departments}
          companies={companies}
          defaultCompany={editing?.companyName}
          defaultDepartmentId={editing?.departmentId}
          departmentMode="id"
        />

        <FormField label="Payroll group">
          <select
            name="employee_type"
            required
            defaultValue={editing?.employeeType ?? "Rank & File"}
            className={inputClassName}
          >
            {EMPLOYEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {getEmployeeTypeLabel(type) || type}
              </option>
            ))}
          </select>
        </FormField>

        {isEditing && editing && (
          <FormField label="Status">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing.isActive}
                className="rounded border-slate-300"
              />
              Active
            </label>
          </FormField>
        )}

        <FormModalFooter cancelHref={cancelHref} />
      </form>
    </FormModal>
  );
}
