"use client";

import { HrCheckAction } from "@/components/hr-check-action";
import type { AttendanceRequest } from "@/lib/schema";

import { hrReturnRequestAction } from "@/actions/hr";
import { HR_RETURN_BUTTON_LABELS, RejectRequestButton } from "./reject-request-button";
import { HrBatchCheckRowSelect, useHrBatchCheckOptional } from "./hr-batch-check";

import {
  formatManagerSubmittedDate,
  formatManagerTime,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

export const GROUPED_HEADERS = [
  "Type",
  "Date",
  "Time in / Time out",
  "Approved by",
  "Action",
  "Remarks",
];

function formatRecordDate(date: Date | string | null): string {
  if (!date) return "";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
  mode: "pending" | "checked" | "all";
  readOnly: boolean;
  showEmployeeMeta?: boolean;
  canEdit?: boolean;
  editHref?: string;
}) {
  const typeLabel = getEmployeeTypeLabel(employeeType);
  const isChecked = request.archived;
  const batchCheck = useHrBatchCheckOptional();
  const showBatchSelect =
    batchCheck && !readOnly && mode === "pending" && !isChecked;

  return (
    <tr className="align-top hover:bg-slate-50/60">
      {showBatchSelect && (
        <td className="w-10 px-3 py-4">
          <HrBatchCheckRowSelect refId={request.refId} />
        </td>
      )}
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

function CheckedStatus({
  archivedBy,
  archivedAt,
}: {
  archivedBy: string | null;
  archivedAt: Date | string | null;
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
