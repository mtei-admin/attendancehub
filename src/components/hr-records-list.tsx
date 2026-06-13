import { archiveRequestAction, checkRequestAction, hrRejectRequestAction } from "@/actions/hr";
import type { AttendanceRequest } from "@/lib/schema";

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
};

function formatApprovedDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function HrRecordsList({
  requests,
  employeeTypeLookup,
  mode,
  emptyMessage = "No records found.",
}: HrRecordsListProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {[
              "Employee",
              "Type",
              "Date",
              "Time in",
              "Time out",
              "Approved by",
              "Action",
              "Remarks",
            ].map((header) => (
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
            const employeeType =
              employeeTypeLookup[`${request.department ?? ""}::${request.employeeName}`];
            const typeLabel = getEmployeeTypeLabel(employeeType);
            const isChecked = request.archived;
            const showPendingActions = mode === "pending" || (mode === "all" && !isChecked);

            return (
              <tr key={request.id} className="align-top hover:bg-slate-50/60">
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
                    {request.department || "—"} · {formatManagerSubmittedDate(request.submittedAt)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {request.requestType}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-700">{request.dateOfIncident}</td>
                <td className="px-4 py-4 text-slate-700">{formatManagerTime(request.timeIn)}</td>
                <td className="px-4 py-4 text-slate-700">{formatManagerTime(request.timeOut)}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{request.approvedBy || "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatApprovedDate(request.approvedOn)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {showPendingActions ? (
                    <div className="flex flex-col items-start gap-2">
                      <form action={checkRequestAction}>
                        <input type="hidden" name="ref_id" value={request.refId} />
                        <button
                          type="submit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
                          title="Mark as checked"
                        >
                          ✓
                        </button>
                      </form>
                      <form action={hrRejectRequestAction}>
                        <input type="hidden" name="ref_id" value={request.refId} />
                        <button
                          type="submit"
                          className="text-xs font-semibold text-red-600 underline hover:text-red-700"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                      ✓
                    </span>
                  )}
                </td>
                <td className="max-w-xs px-4 py-4 text-slate-600">{request.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
