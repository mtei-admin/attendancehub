import Link from "next/link";

import type { Department } from "@/lib/schema";

import { DepartmentModal } from "./department-modal";

type DepartmentPanelProps = {
  departments: Department[];
  saveAction: (formData: FormData) => Promise<void>;
  editId?: number;
  showAdd?: boolean;
  tab: string;
};

export function DepartmentPanel({
  departments,
  saveAction,
  editId,
  showAdd = false,
  tab,
}: DepartmentPanelProps) {
  const editing = editId ? departments.find((row) => row.id === editId) : null;
  const showModal = showAdd || Boolean(editing);
  const panelHref = `/admin?tab=${tab}`;
  const activeDepartments = departments.filter((department) => department.isActive);

  return (
    <>
      <DepartmentModal
        open={showModal}
        cancelHref={panelHref}
        saveAction={saveAction}
        editing={editing}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Departments ({activeDepartments.length})
          </h2>
          <Link
            href={`${panelHref}&add=1`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Add department
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Department", "Status", "Actions"].map((header) => (
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
              {departments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No departments yet.
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr key={department.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{department.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          department.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {department.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`${panelHref}&edit=${department.id}`}
                        className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                      >
                        Edit
                      </Link>
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
