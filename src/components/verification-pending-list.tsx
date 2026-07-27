"use client";

import Link from "next/link";
import { useMemo } from "react";

import { buildSectionId } from "@/lib/collapse-groups";
import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";
import { isOwnSlip } from "@/lib/verification";

import {
  CollapseGroupProvider,
  CollapseGroupToolbar,
  CollapsibleSection,
} from "./collapsible-group";
import {
  formatManagerSubmittedDate,
  formatManagerTime,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

type VerificationPendingListProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
  verifierFullName: string;
  panelHref: string;
  editRefId?: string;
  currentCutoffLabels?: string[];
};

type EmployeeGroup = {
  employeeName: string;
  requests: AttendanceRequest[];
};

function groupRequestsByEmployeeName(requests: AttendanceRequest[]): EmployeeGroup[] {
  const byEmployee = new Map<string, AttendanceRequest[]>();

  for (const request of requests) {
    const existing = byEmployee.get(request.employeeName) ?? [];
    existing.push(request);
    byEmployee.set(request.employeeName, existing);
  }

  return Array.from(byEmployee.entries())
    .map(([employeeName, employeeRequests]) => ({
      employeeName,
      requests: employeeRequests.sort((left, right) =>
        right.dateOfIncident.localeCompare(left.dateOfIncident),
      ),
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export function VerificationPendingList({
  requests,
  employeeTypeLookup,
  verifierFullName,
  panelHref,
  editRefId,
  currentCutoffLabels = [],
}: VerificationPendingListProps) {
  const groups = useMemo(() => groupRequestsByEmployeeName(requests), [requests]);
  const allSectionIds = useMemo(
    () => groups.map((group) => buildSectionId("emp", group.employeeName)),
    [groups],
  );

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-brand-500">✅</div>
        <p className="text-sm text-slate-400">
          No requests awaiting verification in the current cutoff
        </p>
        {currentCutoffLabels.length > 0 ? (
          <p className="mt-2 max-w-lg text-xs text-slate-400">
            Showing current cutoff only — {currentCutoffLabels.join(" · ")}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <CollapseGroupProvider storageKey="verification:pending" allSectionIds={allSectionIds}>
      <div className="space-y-4 py-6">
        {currentCutoffLabels.length > 0 ? (
          <p className="text-xs text-slate-500">
            Showing current cutoff only — {currentCutoffLabels.join(" · ")}
          </p>
        ) : null}

        <CollapseGroupToolbar />

        <div className="space-y-4">
          {groups.map((group) => {
            const sectionId = buildSectionId("emp", group.employeeName);
            const sample = group.requests[0]!;
            const employeeType = employeeTypeLookup[requestEmployeeKey(sample)];
            const typeLabel = getEmployeeTypeLabel(employeeType);
            const ownSlip = isOwnSlip(verifierFullName, group.employeeName);

            return (
              <CollapsibleSection
                key={sectionId}
                id={sectionId}
                level="section"
                title={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span>{group.employeeName}</span>
                    {typeLabel ? (
                      <span
                        className={ounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide }
                      >
                        {typeLabel}
                      </span>
                    ) : null}
                    {ownSlip ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                        Own slip
                      </span>
                    ) : null}
                  </span>
                }
                subtitle={${sample.company ? ${sample.company} ·  : ""}}
                badge={
                  <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                    {group.requests.length} slip{group.requests.length === 1 ? "" : "s"}
                  </span>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        {["Type", "Date", "Time in", "Time out", "Action", "Remarks"].map(
                          (header) => (
                            <th
                              key={header}
                              className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                            >
                              {header}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.requests.map((request) => {
                        const isEditing = editRefId === request.refId;

                        return (
                          <tr
                            key={request.id}
                            className={lign-top hover:bg-slate-50/60 }
                          >
                            <td className="px-4 py-4">
                              <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {request.requestType}
                              </span>
                              <p className="mt-1 text-xs text-slate-500">
                                Filed {formatManagerSubmittedDate(request.submittedAt)}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-slate-700">{request.dateOfIncident}</td>
                            <td className="px-4 py-4 text-slate-700">
                              {formatManagerTime(request.timeIn)}
                            </td>
                            <td className="px-4 py-4 text-slate-700">
                              {formatManagerTime(request.timeOut)}
                            </td>
                            <td className="px-4 py-4">
                              {ownSlip ? (
                                <span className="text-xs text-slate-400">Cannot verify</span>
                              ) : (
                                <Link
                                  href={${panelHref}&edit=}
                                  className="inline-flex rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700"
                                >
                                  Edit &amp; verify
                                </Link>
                              )}
                            </td>
                            <td className="max-w-xs px-4 py-4 text-slate-600">{request.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CollapsibleSection>
            );
          })}
        </div>
      </div>
    </CollapseGroupProvider>
  );
}
