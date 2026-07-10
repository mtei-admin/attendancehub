import { HrCheckAction } from "@/components/hr-check-action";
import { groupAttendanceRequestsByPlacement } from "@/lib/admin-stats";
import { HrRecordsGroupedList } from "@/components/hr-records-grouped-list";
import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";

import { hrReturnRequestAction } from "@/actions/hr";
import { HR_RETURN_BUTTON_LABELS, RejectRequestButton } from "./reject-request-button";

import {
  formatManagerSubmittedDate,
  formatManagerTime,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

type HrRecordsListProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
  mode: "pending" | "checked" | "all";
  emptyMessage?: string;
  readOnly?: boolean;
  grouped?: boolean;
  collapseStorageKey?: string;
  editableRefIds?: ReadonlySet<string>;
  getEditHref?: (refId: string) => string;
};

function formatRecordDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CheckedStatus({
  archivedBy,
  archivedAt,
}: {
  archivedBy: string | null;
  archivedAt: Date | null;
}) {
  return (
    <div>
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        <span aria-hidden>✓</span>
        Checked
      </span>
      {(archivedBy || archivedAt) && (
        <p className="mt-1 text-xs text-slate-500">
          {archivedBy ? `by ${archivedBy}` : "Checked"}
          {archivedAt ? ` ${formatRecordDate(archivedAt)}` : ""}
        </p>
      )}
    </div>
  );
}

export function HrRecordRow({
  request,
  employeeType,
  mode,
  readOnly,
  showEmployeeMeta = true,
  canEdit = false,
  editHref,
}: {
  request: AttendanceRequest;
  employeeType?: string;
  mode: HrRecordsListProps["mode"];
  readOnly: boolean;
  showEmployeeMeta?: boolean;
  canEdit?: boolean;
  editHref?: string;
}) {
  const typeLabel = getEmployeeTypeLabel(employeeType);
  const isChecked = request.archived;

  return (
    <tr className="align-top hover:bg-slate-50/60">
      {showEmployeeMeta && (
        <td className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{request.employeeName}</span>
            {typeLabel && (
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEmployeeTypeBadgeClass(employeeType)}`}
              >
                {typeLabel}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {request.company ? `${request.company} · ` : ""}
            {request.department || "—"} · {formatManagerSubmittedDate(request.submittedAt)}
          </p>
        </td>
      )}
      <td className="px-4 py-4">
        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {request.requestType}
        </span>
        {!showEmployeeMeta && (
          <p className="mt-1 text-xs text-slate-500">
            {request.refId} · {formatManagerSubmittedDate(request.submittedAt)}
          </p>
        )}
      </td>
      <td className="px-4 py-4 text-slate-700">{request.dateOfIncident}</td>
      <td className="px-4 py-4 text-slate-700">
        <p>{formatManagerTime(request.timeIn)}</p>
        <p className="mt-1">{formatManagerTime(request.timeOut)}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-slate-900">{request.approvedBy || "—"}</p>
        <p className="mt-1 text-xs text-slate-500">{formatRecordDate(request.approvedOn)}</p>
      </td>
      <td className="px-4 py-4">
        <div className="space-y-2">
          {!readOnly && mode === "pending" && !isChecked && (
            <HrCheckAction request={request} />
          )}

          {!readOnly && mode === "all" && !isChecked && (
            <span className="text-sm text-slate-400">Pending</span>
          )}

          {(readOnly || mode === "checked" || (mode === "all" && isChecked)) && (
            <div className="space-y-2">
              <CheckedStatus archivedBy={request.archivedBy} archivedAt={request.archivedAt} />
              {!readOnly &&
                isChecked &&
                !request.payrollConfirmedPeriodId &&
                (mode === "checked" || mode === "all") && (
                  <RejectRequestButton
                    refId={request.refId}
                    action={hrReturnRequestAction}
                    labels={HR_RETURN_BUTTON_LABELS}
                  />
                )}
            </div>
          )}

          {canEdit && editHref && (
            <a
              href={editHref}
              className="inline-block text-xs font-semibold text-brand-600 underline hover:text-brand-700"
            >
              Edit
            </a>
          )}
        </div>
      </td>
      <td className="max-w-xs px-4 py-4 text-slate-600">{request.reason}</td>
    </tr>
  );
}

export const GROUPED_HEADERS = ["Type", "Date", "Time in / Time out", "Approved by", "Action", "Remarks"];
const FLAT_HEADERS = ["Employee", ...GROUPED_HEADERS];

export function HrRecordsList({
  requests,
  employeeTypeLookup,
  mode,
  emptyMessage = "No records found.",
  readOnly = false,
  grouped = false,
  collapseStorageKey,
  editableRefIds,
  getEditHref,
}: HrRecordsListProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  if (grouped) {
    const groupedRequests = groupAttendanceRequestsByPlacement(requests);
    const storageKey =
      collapseStorageKey ?? `hr:grouped:${mode}:${readOnly ? "readonly" : "edit"}`;

    return (
      <HrRecordsGroupedList
        groupedRequests={groupedRequests}
        employeeTypeLookup={employeeTypeLookup}
        mode={mode}
        readOnly={readOnly}
        collapseStorageKey={storageKey}
        editableRefIds={editableRefIds}
        getEditHref={getEditHref}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {FLAT_HEADERS.map((header) => (
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
          {requests.map((request) => {
            const employeeType = employeeTypeLookup[requestEmployeeKey(request)];

            return (
              <HrRecordRow
                key={request.id}
                request={request}
                employeeType={employeeType}
                mode={mode}
                readOnly={readOnly}
                canEdit={editableRefIds?.has(request.refId) ?? false}
                editHref={getEditHref?.(request.refId)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
