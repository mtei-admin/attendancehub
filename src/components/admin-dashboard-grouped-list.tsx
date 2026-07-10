"use client";

import Link from "next/link";
import { useMemo } from "react";

import {
  CollapseGroupProvider,
  CollapseGroupToolbar,
  CollapsibleSection,
} from "@/components/collapsible-group";
import {
  buildSectionId,
  shouldAutoExpandEmployeeSection,
} from "@/lib/collapse-groups";
import type {
  AdminDashboardView,
  GroupedCompanyRoster,
  GroupedCompanySlips,
} from "@/lib/admin-stats";

type AdminDashboardGroupedListProps = {
  view: AdminDashboardView;
  groupedSlips: GroupedCompanySlips[];
  groupedEmployees: GroupedCompanyRoster[];
  totalCount: number;
};

const VIEW_TITLES: Record<AdminDashboardView, string> = {
  employees: "Active employees",
  "pending-verification": "Pending verification",
  "pending-manager": "Pending manager approval",
  "pending-hr": "Pending HR processing",
  "all-requests": "All requests",
};

function workflowBadgeClass(label: string): string {
  if (label === "Checked") return "bg-emerald-100 text-emerald-700";
  if (label === "HR pending") return "bg-orange-100 text-orange-700";
  if (label === "Rejected") return "bg-red-100 text-red-700";
  if (label === "Manager pending") return "bg-amber-100 text-amber-700";
  return "bg-cyan-100 text-cyan-700";
}

function collectSlipSectionIds(groupedSlips: GroupedCompanySlips[]): string[] {
  const ids: string[] = [];

  for (const companyGroup of groupedSlips) {
    const companyId = buildSectionId("company", companyGroup.company);
    ids.push(companyId);

    for (const departmentGroup of companyGroup.departments) {
      const departmentId = buildSectionId(companyId, "dept", departmentGroup.department);
      ids.push(departmentId);

      for (const employeeGroup of departmentGroup.employees) {
        ids.push(buildSectionId(departmentId, "emp", employeeGroup.employeeName));
      }
    }
  }

  return ids;
}

function collectEmployeeSectionIds(groupedEmployees: GroupedCompanyRoster[]): string[] {
  const ids: string[] = [];

  for (const companyGroup of groupedEmployees) {
    const companyId = buildSectionId("company", companyGroup.company);
    ids.push(companyId);

    for (const departmentGroup of companyGroup.departments) {
      ids.push(buildSectionId(companyId, "dept", departmentGroup.department));
    }
  }

  return ids;
}

export function AdminDashboardGroupedList({
  view,
  groupedSlips,
  groupedEmployees,
  totalCount,
}: AdminDashboardGroupedListProps) {
  const title = VIEW_TITLES[view];
  const storageKey = `admin:dashboard:${view}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount} {view === "employees" ? "employee(s)" : "slip(s)"} · grouped by company,
            department, and employee
          </p>
        </div>
        <Link
          href="/admin?tab=dashboard"
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Close
        </Link>
      </div>

      <div className="max-h-[min(70vh,800px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {view === "employees" ? (
          <EmployeeGroupedList
            groupedEmployees={groupedEmployees}
            collapseStorageKey={storageKey}
          />
        ) : (
          <SlipGroupedList groupedSlips={groupedSlips} collapseStorageKey={storageKey} />
        )}
      </div>
    </section>
  );
}

function EmployeeGroupedList({
  groupedEmployees,
  collapseStorageKey,
}: {
  groupedEmployees: GroupedCompanyRoster[];
  collapseStorageKey: string;
}) {
  const allSectionIds = useMemo(
    () => collectEmployeeSectionIds(groupedEmployees),
    [groupedEmployees],
  );

  if (groupedEmployees.length === 0) {
    return <EmptyState message="No active employees found." />;
  }

  return (
    <CollapseGroupProvider storageKey={collapseStorageKey} allSectionIds={allSectionIds}>
      <CollapseGroupToolbar />
      <div className="divide-y divide-slate-100">
        {groupedEmployees.map((companyGroup) => {
          const companyId = buildSectionId("company", companyGroup.company);
          const companyDescendants = allSectionIds.filter(
            (id) => id.startsWith(`${companyId}/`) && id !== companyId,
          );

          return (
            <CollapsibleSection
              key={companyGroup.company}
              id={companyId}
              level="company"
              title={companyGroup.company}
              descendantIds={companyDescendants}
            >
              {companyGroup.departments.map((departmentGroup) => {
                const departmentId = buildSectionId(
                  companyId,
                  "dept",
                  departmentGroup.department,
                );

                return (
                  <CollapsibleSection
                    key={`${companyGroup.company}-${departmentGroup.department}`}
                    id={departmentId}
                    level="department"
                    title={departmentGroup.department}
                    badge={
                      <span className="text-xs text-slate-500">
                        {departmentGroup.employees.length} employee
                        {departmentGroup.employees.length === 1 ? "" : "s"}
                      </span>
                    }
                  >
                    <ul className="divide-y divide-slate-50">
                      {departmentGroup.employees.map((employee) => (
                        <li
                          key={`${companyGroup.company}-${departmentGroup.department}-${employee.employeeName}`}
                          className="flex items-center justify-between gap-4 px-4 py-3 pl-10"
                        >
                          <span className="font-medium text-slate-900">{employee.employeeName}</span>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {employee.employeeType}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleSection>
                );
              })}
            </CollapsibleSection>
          );
        })}
      </div>
    </CollapseGroupProvider>
  );
}

function SlipGroupedList({
  groupedSlips,
  collapseStorageKey,
}: {
  groupedSlips: GroupedCompanySlips[];
  collapseStorageKey: string;
}) {
  const allSectionIds = useMemo(() => collectSlipSectionIds(groupedSlips), [groupedSlips]);

  if (groupedSlips.length === 0) {
    return <EmptyState message="No slips match this view." />;
  }

  return (
    <CollapseGroupProvider storageKey={collapseStorageKey} allSectionIds={allSectionIds}>
      <CollapseGroupToolbar />
      <div className="divide-y divide-slate-100">
        {groupedSlips.map((companyGroup) => {
          const companyId = buildSectionId("company", companyGroup.company);
          const companyDescendants = allSectionIds.filter(
            (id) => id.startsWith(`${companyId}/`) && id !== companyId,
          );

          return (
            <CollapsibleSection
              key={companyGroup.company}
              id={companyId}
              level="company"
              title={companyGroup.company}
              descendantIds={companyDescendants}
            >
              {companyGroup.departments.map((departmentGroup) => {
                const departmentId = buildSectionId(
                  companyId,
                  "dept",
                  departmentGroup.department,
                );
                const departmentDescendants = allSectionIds.filter(
                  (id) => id.startsWith(`${departmentId}/`) && id !== departmentId,
                );
                const autoExpandChildIds = departmentGroup.employees
                  .filter((employeeGroup) =>
                    shouldAutoExpandEmployeeSection(employeeGroup.slips.length),
                  )
                  .map((employeeGroup) =>
                    buildSectionId(departmentId, "emp", employeeGroup.employeeName),
                  );

                return (
                  <CollapsibleSection
                    key={`${companyGroup.company}-${departmentGroup.department}`}
                    id={departmentId}
                    level="department"
                    title={departmentGroup.department}
                    descendantIds={departmentDescendants}
                    autoExpandChildIds={autoExpandChildIds}
                  >
                    {departmentGroup.employees.map((employeeGroup) => {
                      const employeeId = buildSectionId(
                        departmentId,
                        "emp",
                        employeeGroup.employeeName,
                      );

                      return (
                        <CollapsibleSection
                          key={`${companyGroup.company}-${departmentGroup.department}-${employeeGroup.employeeName}`}
                          id={employeeId}
                          level="employee"
                          title={
                            <>
                              {employeeGroup.employeeName}
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({employeeGroup.slips.length} slip
                                {employeeGroup.slips.length === 1 ? "" : "s"})
                              </span>
                            </>
                          }
                        >
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="bg-slate-50/80">
                                <tr>
                                  {["Ref", "Type", "Incident", "Workflow", "Submitted", ""].map(
                                    (header) => (
                                      <th
                                        key={header || "actions"}
                                        className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                                      >
                                        {header}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {employeeGroup.slips.map((slip) => (
                                  <tr key={slip.refId} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 pl-10 font-medium text-slate-900">
                                      {slip.refId}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-700">{slip.requestType}</td>
                                    <td className="px-4 py-2.5 text-slate-700">
                                      {slip.dateOfIncident}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span
                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${workflowBadgeClass(slip.workflowLabel)}`}
                                      >
                                        {slip.workflowLabel}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-600">
                                      {slip.submittedLabel}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <Link
                                        href={`/admin?tab=slips&edit_ref=${encodeURIComponent(slip.refId)}`}
                                        className="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                                      >
                                        Edit
                                      </Link>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleSection>
                      );
                    })}
                  </CollapsibleSection>
                );
              })}
            </CollapsibleSection>
          );
        })}
      </div>
    </CollapseGroupProvider>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{message}</div>;
}
