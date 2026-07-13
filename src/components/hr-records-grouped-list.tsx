"use client";

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
import type { GroupedCompanyRequests } from "@/lib/admin-stats";
import { requestEmployeeKey } from "@/lib/roster";

import {
  HrBatchCheckProvider,
  HrBatchCheckSectionSelect,
  HrBatchCheckToolbar,
  type SlipVisibility,
} from "./hr-batch-check";
import { HrRecordRow, GROUPED_HEADERS } from "./hr-record-row";
import {
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

type HrRecordsGroupedListProps = {
  groupedRequests: GroupedCompanyRequests[];
  employeeTypeLookup: Record<string, string>;
  mode: "pending" | "checked" | "all";
  readOnly: boolean;
  collapseStorageKey: string;
  editableRefIds?: string[];
  editHrefByRefId?: Record<string, string>;
  enableBatchCheck?: boolean;
  batchReturnTab?: string;
};

function collectSectionIds(groupedRequests: GroupedCompanyRequests[]): string[] {
  const ids: string[] = [];

  for (const companyGroup of groupedRequests) {
    const companyId = buildSectionId("company", companyGroup.company);
    ids.push(companyId);

    for (const departmentGroup of companyGroup.departments) {
      const departmentId = buildSectionId(companyId, "dept", departmentGroup.department);
      ids.push(departmentId);

      for (const employeeGroup of departmentGroup.employees) {
        ids.push(
          buildSectionId(departmentId, "emp", employeeGroup.employeeName),
        );
      }
    }
  }

  return ids;
}

function buildSlipVisibilities(groupedRequests: GroupedCompanyRequests[]): SlipVisibility[] {
  const visibilities: SlipVisibility[] = [];

  for (const companyGroup of groupedRequests) {
    const companyId = buildSectionId("company", companyGroup.company);

    for (const departmentGroup of companyGroup.departments) {
      const departmentId = buildSectionId(companyId, "dept", departmentGroup.department);

      for (const employeeGroup of departmentGroup.employees) {
        const employeeId = buildSectionId(departmentId, "emp", employeeGroup.employeeName);

        for (const request of employeeGroup.requests) {
          visibilities.push({
            refId: request.refId,
            companyId,
            departmentId,
            employeeId,
          });
        }
      }
    }
  }

  return visibilities;
}

function collectRefIdsUnderCompany(
  companyGroup: GroupedCompanyRequests,
  companyId: string,
): string[] {
  const refIds: string[] = [];

  for (const departmentGroup of companyGroup.departments) {
    const departmentId = buildSectionId(companyId, "dept", departmentGroup.department);
    refIds.push(...collectRefIdsUnderDepartment(departmentGroup, departmentId));
  }

  return refIds;
}

function collectRefIdsUnderDepartment(
  departmentGroup: GroupedCompanyRequests["departments"][number],
  departmentId: string,
): string[] {
  const refIds: string[] = [];

  for (const employeeGroup of departmentGroup.employees) {
    refIds.push(...employeeGroup.requests.map((request) => request.refId));
  }

  return refIds;
}

export function HrRecordsGroupedList({
  groupedRequests,
  employeeTypeLookup,
  mode,
  readOnly,
  collapseStorageKey,
  editableRefIds,
  editHrefByRefId,
  enableBatchCheck = false,
  batchReturnTab = "pending",
}: HrRecordsGroupedListProps) {
  const allSectionIds = useMemo(
    () => collectSectionIds(groupedRequests),
    [groupedRequests],
  );

  const flatRequests = useMemo(
    () =>
      groupedRequests.flatMap((companyGroup) =>
        companyGroup.departments.flatMap((departmentGroup) =>
          departmentGroup.employees.flatMap((employeeGroup) => employeeGroup.requests),
        ),
      ),
    [groupedRequests],
  );

  const slipVisibilities = useMemo(
    () => buildSlipVisibilities(groupedRequests),
    [groupedRequests],
  );

  const showBatchCheck = enableBatchCheck && mode === "pending" && !readOnly;

  const listBody = (
    <div className="divide-y divide-slate-100">
      {groupedRequests.map((companyGroup) => {
        const companyId = buildSectionId("company", companyGroup.company);
        const companyDescendants = allSectionIds.filter(
          (id) => id.startsWith(`${companyId}/`) || id === companyId,
        ).filter((id) => id !== companyId);
        const companyRefIds = collectRefIdsUnderCompany(companyGroup, companyId);

        return (
          <CollapsibleSection
            key={companyGroup.company}
            id={companyId}
            level="company"
            title={
              <span className="flex flex-wrap items-center gap-3">
                {companyGroup.company}
                {showBatchCheck && (
                  <HrBatchCheckSectionSelect
                    refIds={companyRefIds}
                    label={`Select visible slips in ${companyGroup.company}`}
                  />
                )}
              </span>
            }
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
              const departmentRefIds = collectRefIdsUnderDepartment(
                departmentGroup,
                departmentId,
              );
              const autoExpandChildIds = departmentGroup.employees
                .filter((employeeGroup) =>
                  shouldAutoExpandEmployeeSection(employeeGroup.requests.length),
                )
                .map((employeeGroup) =>
                  buildSectionId(departmentId, "emp", employeeGroup.employeeName),
                );

              return (
                <CollapsibleSection
                  key={`${companyGroup.company}-${departmentGroup.department}`}
                  id={departmentId}
                  level="department"
                  title={
                    <span className="flex flex-wrap items-center gap-3">
                      {departmentGroup.department}
                      {showBatchCheck && (
                        <HrBatchCheckSectionSelect
                          refIds={departmentRefIds}
                          label={`Select visible slips in ${departmentGroup.department}`}
                        />
                      )}
                    </span>
                  }
                  descendantIds={departmentDescendants}
                  autoExpandChildIds={autoExpandChildIds}
                >
                  {departmentGroup.employees.map((employeeGroup) => {
                    const employeeType =
                      employeeTypeLookup[requestEmployeeKey(employeeGroup.requests[0]!)];
                    const typeLabel = getEmployeeTypeLabel(employeeType);
                    const employeeId = buildSectionId(
                      departmentId,
                      "emp",
                      employeeGroup.employeeName,
                    );
                    const employeeRefIds = employeeGroup.requests.map(
                      (request) => request.refId,
                    );

                    return (
                      <CollapsibleSection
                        key={`${departmentId}-${employeeGroup.employeeName}`}
                        id={employeeId}
                        level="employee"
                        title={
                          <span className="flex flex-wrap items-center gap-2">
                            {showBatchCheck && (
                              <HrBatchCheckSectionSelect
                                refIds={employeeRefIds}
                                label={`Select visible slips for ${employeeGroup.employeeName}`}
                              />
                            )}
                            {employeeGroup.employeeName}
                            {typeLabel && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEmployeeTypeBadgeClass(employeeType)}`}
                              >
                                {typeLabel}
                              </span>
                            )}
                          </span>
                        }
                        badge={
                          <span className="shrink-0 text-xs text-slate-500">
                            {employeeGroup.requests.length} slip
                            {employeeGroup.requests.length === 1 ? "" : "s"}
                          </span>
                        }
                      >
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/80">
                              <tr>
                                {showBatchCheck && <th className="w-10 px-3 py-2" />}
                                {GROUPED_HEADERS.map((header) => (
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
                              {employeeGroup.requests.map((request) => (
                                <HrRecordRow
                                  key={request.id}
                                  request={request}
                                  employeeType={employeeType}
                                  mode={mode}
                                  readOnly={readOnly}
                                  showEmployeeMeta={false}
                                  canEdit={editableRefIds?.includes(request.refId) ?? false}
                                  editHref={editHrefByRefId?.[request.refId]}
                                />
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
  );

  return (
    <CollapseGroupProvider storageKey={collapseStorageKey} allSectionIds={allSectionIds}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <CollapseGroupToolbar />
        {showBatchCheck ? (
          <HrBatchCheckProvider requests={flatRequests} slipVisibilities={slipVisibilities}>
            <HrBatchCheckToolbar returnTab={batchReturnTab} />
            {listBody}
          </HrBatchCheckProvider>
        ) : (
          listBody
        )}
      </div>
    </CollapseGroupProvider>
  );
}
