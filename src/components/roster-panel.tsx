import Link from "next/link";

import type { Department } from "@/lib/schema";
import type { EmployeeWithDepartment } from "@/lib/roster";

import { EmployeeRosterModal } from "./employee-roster-modal";
import { RosterPanelTable } from "./roster-panel-table";

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

        <RosterPanelTable
          employees={rosterEmployees}
          rosterHref={rosterHref}
          deleteAction={deleteAction}
        />
      </section>
    </>
  );
}
