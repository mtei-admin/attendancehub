"use client";

import { useMemo } from "react";

import {
  buildSectionId,
  shouldAutoExpandEmployeeSection,
} from "@/lib/collapse-groups";
import {
  buildManagerGroupedRequests,
  type ManagerCutoffGroup,
} from "@/lib/manager-grouping";
import type { AttendanceRequest, PayrollCutoffRule } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";

import {
  CollapseGroupProvider,
  CollapseGroupToolbar,
  CollapsibleSection,
} from "./collapsible-group";
import {
  formatManagerSubmittedDate,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

type VerificationVerifiedListProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
  cutoffRules: PayrollCutoffRule[];
};

type CutoffNameGroup = ManagerCutoffGroup & {
  payrollGroup: string;
};

function collectSectionIds(groups: CutoffNameGroup[]): string[] {
  const ids: string[] = [];
  for (const cutoffGroup of groups) {
    const cutoffId = buildSectionId("cutoff", cutoffGroup.payrollGroup, cutoffGroup.periodId);
    ids.push(cutoffId);
    for (const employeeGroup of cutoffGroup.employees) {
      ids.push(buildSectionId(cutoffId, "emp", employeeGroup.employeeName));
    }
  }
  return ids;
}

export function VerificationVerifiedList({
  requests,
  employeeTypeLookup,
  cutoffRules,
}: VerificationVerifiedListProps) {
  const cutoffGroups = useMemo(() => {
    const grouped = buildManagerGroupedRequests(
      requests,
      "all",
      cutoffRules,
      employeeTypeLookup,
    );

    const flattened: CutoffNameGroup[] = grouped.sections.flatMap((section) =>
      section.cutoffGroups.map((cutoffGroup) => ({
        ...cutoffGroup,
        payrollGroup: section.payrollGroup,
      })),
    );

    return flattened.sort((left, right) => right.periodId.localeCompare(left.periodId));
  }, [requests, cutoffRules, employeeTypeLookup]);

  const allSectionIds = useMemo(() => collectSectionIds(cutoffGroups), [cutoffGroups]);

  if (requests.length === 0 || cutoffGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-slate-400">✅</div>
        <p className="text-sm text-slate-400">No verified requests awaiting manager approval</p>
      </div>
    );
  }

  return (
    <CollapseGroupProvider storageKey="verification:verified" allSectionIds={allSectionIds}>
      <div className="space-y-4 py-6">
        <CollapseGroupToolbar />

        <div className="space-y-4">
          {cutoffGroups.map((cutoffGroup) => {
            const cutoffId = buildSectionId(
              "cutoff",
              cutoffGroup.payrollGroup,
              cutoffGroup.periodId,
            );
            const cutoffDescendants = allSectionIds.filter(
              (id) => id.startsWith(`${cutoffId}/`) && id !== cutoffId,
            );
            const autoExpandChildIds = cutoffGroup.employees
              .filter((employeeGroup) =>
                shouldAutoExpandEmployeeSection(employeeGroup.requests.length),
              )
              .map((employeeGroup) =>
                buildSectionId(cutoffId, "emp", employeeGroup.employeeName),
              );

            return (
              <CollapsibleSection
                key={cutoffId}
                id={cutoffId}
                level="section"
                title={cutoffGroup.periodLabel}
                subtitle={cutoffGroup.payrollGroup}
                badge={
                  <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                    {cutoffGroup.requestCount} slip
                    {cutoffGroup.requestCount === 1 ? "" : "s"}
                  </span>
                }
                descendantIds={cutoffDescendants}
                autoExpandChildIds={autoExpandChildIds}
              >
                <div className="divide-y divide-slate-100">
                  {cutoffGroup.employees.map((employeeGroup) => {
                    const employeeId = buildSectionId(
                      cutoffId,
                      "emp",
                      employeeGroup.employeeName,
                    );
                    const sample = employeeGroup.requests[0]!;
                    const employeeType = employeeTypeLookup[requestEmployeeKey(sample)];
                    const typeLabel = getEmployeeTypeLabel(employeeType);

                    return (
                      <CollapsibleSection
                        key={employeeId}
                        id={employeeId}
                        level="employee"
                        title={
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span>{employeeGroup.employeeName}</span>
                            {typeLabel ? (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEmployeeTypeBadgeClass(employeeType)}`}
                              >
                                {typeLabel}
                              </span>
                            ) : null}
                          </span>
                        }
                        subtitle={`${sample.company ? `${sample.company} · ` : ""}${sample.department || "—"}`}
                        badge={
                          <span className="text-xs font-medium text-slate-500">
                            {employeeGroup.requests.length} slip
                            {employeeGroup.requests.length === 1 ? "" : "s"}
                          </span>
                        }
                      >
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/50">
                              <tr>
                                {[
                                  "Type",
                                  "Date",
                                  "Verified by",
                                  "Verified on",
                                  "Note",
                                  "Remarks",
                                ].map((header) => (
                                  <th
                                    key={header}
                                    className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {employeeGroup.requests.map((request) => (
                                <tr
                                  key={request.id}
                                  className="align-top hover:bg-slate-50/60"
                                >
                                  <td className="px-4 py-3">
                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                      {request.requestType}
                                    </span>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Filed {formatManagerSubmittedDate(request.submittedAt)}
                                    </p>
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {request.dateOfIncident}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {request.verifiedBy ?? "—"}
                                  </td>
                                  <td className="px-4 py-3 text-slate-700">
                                    {request.verifiedOn
                                      ? formatManagerSubmittedDate(request.verifiedOn)
                                      : "—"}
                                  </td>
                                  <td className="max-w-xs px-4 py-3 text-slate-600">
                                    {request.verificationNote || "—"}
                                  </td>
                                  <td className="max-w-xs px-4 py-3 text-slate-600">
                                    {request.reason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleSection>
                    );
                  })}
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      </div>
    </CollapseGroupProvider>
  );
}
