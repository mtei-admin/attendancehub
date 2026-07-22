"use client";

import { useMemo } from "react";

import { updateStatusAction } from "@/actions/requests";
import { needsCheckHoursOnHrCheck } from "@/lib/constants";
import {
  buildSectionId,
  shouldAutoExpandEmployeeSection,
} from "@/lib/collapse-groups";
import type { AttendanceRequest } from "@/lib/schema";
import type { ManagerGroupedRequests } from "@/lib/manager-grouping";

import {
  CollapseGroupProvider,
  CollapseGroupToolbar,
  CollapsibleSection,
} from "./collapsible-group";
import { inputClassName } from "./form-field";
import {
  formatManagerSubmittedDate,
  formatManagerTime,
} from "./manager-request-utils";
import { RejectRequestButton } from "./reject-request-button";
import { PendingSubmitButton } from "./pending-submit-button";

type ManagerGroupedListProps = {
  grouped: ManagerGroupedRequests;
  mode: "pending" | "history";
  emptyMessage: string;
  collapseStorageKey: string;
};

function needsApproveHrs(requestType: string): boolean {
  return needsCheckHoursOnHrCheck(requestType);
}

function collectManagerSectionIds(grouped: ManagerGroupedRequests): string[] {
  const ids: string[] = [];

  for (const section of grouped.sections) {
    const sectionId = buildSectionId("pg", section.payrollGroup);
    ids.push(sectionId);

    for (const cutoffGroup of section.cutoffGroups) {
      const cutoffId = buildSectionId(sectionId, "cutoff", cutoffGroup.periodId);
      if (section.cutoffGroups.length > 1) {
        ids.push(cutoffId);
      }

      for (const employeeGroup of cutoffGroup.employees) {
        ids.push(buildSectionId(cutoffId, "emp", employeeGroup.employeeName));
      }
    }
  }

  return ids;
}

export function ManagerGroupedList({
  grouped,
  mode,
  emptyMessage,
  collapseStorageKey,
}: ManagerGroupedListProps) {
  const allSectionIds = useMemo(() => collectManagerSectionIds(grouped), [grouped]);

  if (grouped.totalShown === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-slate-400">📋</div>
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <CollapseGroupProvider storageKey={collapseStorageKey} allSectionIds={allSectionIds}>
      <div className="space-y-4 py-6">
        <CollapseGroupToolbar />
        <div className="space-y-8">
          {grouped.sections.map((section) => {
            const sectionId = buildSectionId("pg", section.payrollGroup);
            const sectionDescendants = allSectionIds.filter(
              (id) => id.startsWith(`${sectionId}/`) && id !== sectionId,
            );
            const sectionAutoExpandChildIds = section.cutoffGroups.flatMap((cutoffGroup) => {
              const cutoffId = buildSectionId(sectionId, "cutoff", cutoffGroup.periodId);
              return cutoffGroup.employees
                .filter((employeeGroup) =>
                  shouldAutoExpandEmployeeSection(employeeGroup.requests.length),
                )
                .map((employeeGroup) =>
                  buildSectionId(cutoffId, "emp", employeeGroup.employeeName),
                );
            });

            return (
              <CollapsibleSection
                key={section.payrollGroup}
                id={sectionId}
                level="section"
                title={section.payrollGroup}
                subtitle={section.periodSubtitle}
                badge={
                  <span className="rounded-full bg-slate-200/80 px-3 py-1 text-xs font-semibold text-slate-600">
                    {section.requestCount} slip{section.requestCount === 1 ? "" : "s"}
                  </span>
                }
                descendantIds={sectionDescendants}
                autoExpandChildIds={sectionAutoExpandChildIds}
              >
                <div className="divide-y divide-slate-100">
                  {section.cutoffGroups.map((cutoffGroup) => {
                    const cutoffId = buildSectionId(sectionId, "cutoff", cutoffGroup.periodId);
                    const showCutoffHeader = section.cutoffGroups.length > 1;
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

                    const employeeSections = cutoffGroup.employees.map((employeeGroup) => {
                      const employeeId = buildSectionId(
                        cutoffId,
                        "emp",
                        employeeGroup.employeeName,
                      );

                      return (
                        <CollapsibleSection
                          key={`${cutoffGroup.periodId}-${employeeGroup.employeeName}`}
                          id={employeeId}
                          level="employee"
                          title={employeeGroup.employeeName}
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
                                  {["Type", "Date", "Time in", "Time out", "Action", "Remarks"].map(
                                    (header) => (
                                      <th
                                        key={header}
                                        className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                                      >
                                        {header}
                                      </th>
                                    ),
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {employeeGroup.requests.map((request) => (
                                  <RequestRow key={request.id} request={request} mode={mode} />
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CollapsibleSection>
                      );
                    });

                    if (!showCutoffHeader) {
                      return (
                        <div key={cutoffGroup.periodId}>
                          {employeeSections}
                        </div>
                      );
                    }

                    return (
                      <CollapsibleSection
                        key={cutoffGroup.periodId}
                        id={cutoffId}
                        level="cutoff"
                        title={cutoffGroup.periodLabel}
                        badge={
                          <span className="text-xs text-slate-500">
                            {cutoffGroup.requestCount} slip
                            {cutoffGroup.requestCount === 1 ? "" : "s"}
                          </span>
                        }
                        descendantIds={cutoffDescendants}
                        autoExpandChildIds={autoExpandChildIds}
                      >
                        {employeeSections}
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

function RequestRow({
  request,
  mode,
}: {
  request: AttendanceRequest;
  mode: "pending" | "history";
}) {
  const showApproveHrs = needsApproveHrs(request.requestType);
  const isVerified = Boolean(request.verifiedOn);
  const isReturnedFromHr = Boolean(request.hrReturnReason);

  return (
    <tr className="align-top hover:bg-slate-50/60">
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {request.requestType}
        </span>
        <p className="mt-1 text-xs text-slate-500">
          {request.refId} · {formatManagerSubmittedDate(request.submittedAt)}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-700">{request.dateOfIncident}</td>
      <td className="px-4 py-3 text-slate-700">{formatManagerTime(request.timeIn)}</td>
      <td className="px-4 py-3 text-slate-700">{formatManagerTime(request.timeOut)}</td>
      <td className="px-4 py-3">
        {mode === "pending" ? (
          <>
            {isReturnedFromHr && (
              <span className="mb-2 inline-flex rounded bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-800">
                Returned from HR
              </span>
            )}
            {isVerified ? (
              <span className="mb-2 inline-flex rounded bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                Verified
              </span>
            ) : (
              <span className="mb-2 inline-flex rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Unverified
              </span>
            )}
            {showApproveHrs && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Approve hrs
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <form action={updateStatusAction} className="flex items-center gap-2">
                <input type="hidden" name="ref_id" value={request.refId} />
                <input type="hidden" name="status" value="Approved" />
                {showApproveHrs && (
                  <input
                    type="text"
                    name="approved_ot_hrs"
                    defaultValue={request.otHrs ?? ""}
                    placeholder="e.g. 3"
                    className={`${inputClassName} w-14 py-1.5 text-center`}
                  />
                )}
                <PendingSubmitButton
                  pendingLabel="…"
                  showSpinner={false}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
                  title="Approve"
                >
                  ✓
                </PendingSubmitButton>
              </form>
              <RejectRequestButton
                refId={request.refId}
                action={updateStatusAction}
                variant="icon"
                hiddenFields={{ status: "Rejected" }}
              />
            </div>
            {isVerified && request.verifiedBy && (
              <p className="mt-1 text-[10px] text-slate-400">By {request.verifiedBy}</p>
            )}
          </>
        ) : (
          <StatusBadge status={request.status} />
        )}
      </td>
      <td className="max-w-xs px-4 py-3 text-slate-600">
        {mode === "pending" && isReturnedFromHr ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
              HR return reason
            </p>
            <p className="mt-1">{request.hrReturnReason}</p>
            {request.hrReturnedBy && (
              <p className="mt-1 text-xs text-slate-400">By {request.hrReturnedBy}</p>
            )}
          </div>
        ) : mode === "history" && request.status === "Rejected" && request.rejectionReason ? (
          request.rejectionReason
        ) : (
          request.reason
        )}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <span aria-hidden>✓</span>
        Approved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
      <span aria-hidden>✕</span>
      Rejected
    </span>
  );
}
