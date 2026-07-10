"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatBiometricNo } from "@/lib/biometric";
import { groupEmployeesByPlacement, type EmployeeWithDepartment } from "@/lib/roster";

import { inputClassName } from "./form-field";
import {
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";
import { RosterDeleteButton } from "./roster-delete-button";

type RosterPanelTableProps = {
  employees: EmployeeWithDepartment[];
  rosterHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
};

function matchesSearch(employee: EmployeeWithDepartment, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  if (employee.fullName.toLowerCase().includes(normalized)) {
    return true;
  }

  if (employee.biometricNo != null) {
    const biometric = formatBiometricNo(employee.biometricNo);
    if (biometric.includes(normalized)) {
      return true;
    }
  }

  return false;
}

function RosterEmployeeRow({
  employee,
  rosterHref,
  deleteAction,
}: {
  employee: EmployeeWithDepartment;
  rosterHref: string;
  deleteAction?: (formData: FormData) => Promise<void>;
}) {
  return (
    <tr className="hover:bg-slate-50/60">
      <td className="px-4 py-3 font-semibold text-slate-900">{employee.fullName}</td>
      <td className="px-4 py-3 text-slate-700">
        {employee.biometricNo ?? <span className="text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3 text-slate-700">
        {employee.email ?? <span className="text-slate-400">Not set</span>}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEmployeeTypeBadgeClass(employee.employeeType)}`}
        >
          {getEmployeeTypeLabel(employee.employeeType) || employee.employeeType}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            href={`${rosterHref}&edit=${employee.id}`}
            className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
          >
            Edit
          </Link>
          {deleteAction && (
            <RosterDeleteButton
              employeeId={employee.id}
              employeeName={employee.fullName}
              deleteAction={deleteAction}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

const ROSTER_HEADERS = ["Name", "Biometric #", "Email", "Payroll group", "Actions"];

export function RosterPanelTable({
  employees,
  rosterHref,
  deleteAction,
}: RosterPanelTableProps) {
  const [search, setSearch] = useState("");

  const filteredEmployees = useMemo(
    () => employees.filter((employee) => matchesSearch(employee, search)),
    [employees, search],
  );

  const groupedEmployees = useMemo(
    () => groupEmployeesByPlacement(filteredEmployees),
    [filteredEmployees],
  );

  const showingCount = filteredEmployees.length;
  const totalCount = employees.length;

  return (
    <>
      <div className="border-b border-slate-200 px-5 py-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="roster-search">
          Search roster
        </label>
        <input
          id="roster-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or biometric number..."
          className={`${inputClassName} mt-2 max-w-md`}
        />
        {search.trim() && (
          <p className="mt-2 text-xs text-slate-500">
            Showing {showingCount} of {totalCount} employees
          </p>
        )}
      </div>

      {filteredEmployees.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">
          {search.trim() ? "No employees match your search." : "No employees in the roster yet."}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {groupedEmployees.map((companyGroup) => (
            <div key={companyGroup.company}>
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-900">{companyGroup.company}</h3>
              </div>

              {companyGroup.departments.map((departmentGroup) => (
                <div key={`${companyGroup.company}-${departmentGroup.department}`}>
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 pl-8">
                    <h4 className="text-sm font-medium text-slate-700">{departmentGroup.department}</h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-100 bg-slate-50/80">
                        <tr>
                          {ROSTER_HEADERS.map((header) => (
                            <th
                              key={header}
                              className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {departmentGroup.employees.map((employee) => (
                          <RosterEmployeeRow
                            key={employee.id}
                            employee={employee}
                            rosterHref={rosterHref}
                            deleteAction={deleteAction}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
