import Link from "next/link";

import type { Department } from "@/lib/schema";
import type { EmployeeWithDepartment } from "@/lib/roster";

import { EmployeeRosterModal } from "./employee-roster-modal";
import {
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";
import { RosterDeleteButton } from "./roster-delete-button";

type RosterPanelProps = {
  employees: EmployeeWithDepartment[];
  departments: Department[];
  companies: string[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  editId?: number;
  showAdd?: boolean;
  activeOnly?: boolean;
  basePath: "/hr" | "/admin";
  tab: string;
};

export function RosterPanel({
  employees,
  departments,
  companies,
  saveAction,
  deleteAction,
  editId,
  showAdd = false,
  activeOnly = true,
  basePath,
  tab,
}: RosterPanelProps) {
  const editing = editId ? employees.find((row) => row.id === editId) : null;
  const rosterEmployees = activeOnly
    ? employees.filter((employee) => employee.isActive)
    : employees;
  const showModal = showAdd || Boolean(editing);
  const rosterHref = `${basePath}?tab=${tab}`;

  return (
    <>
      <EmployeeRosterModal
        open={showModal}
        cancelHref={rosterHref}
        saveAction={saveAction}
        departments={departments}
        companies={companies}
        editing={editing}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Employee roster ({rosterEmployees.length})
          </h2>
          <Link
            href={`${rosterHref}&add=1`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Add employee
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Name", "Company · Department", "Payroll group", "Actions"].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rosterEmployees.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No employees in the roster yet.
                  </td>
                </tr>
              ) : (
                rosterEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {employee.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {employee.companyName} · {employee.departmentName}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
