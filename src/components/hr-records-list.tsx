import { HrCheckAction } from "@/components/hr-check-action";
import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";

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

export function HrRecordsList({
  requests,
  employeeTypeLookup,
  mode,
  emptyMessage = "No records found.",
  readOnly = false,
}: HrRecordsListProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const headers = [
    "Employee",
    "Type",
    "Date",
    "Time in / Time out",
    "Approved by",
    "Action",
    "Remarks",
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50">
          <tr>
            {headers.map((header) => (
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
            const typeLabel = getEmployeeTypeLabel(employeeType);
            const isChecked = request.archived;

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
                    {request.company ? `${request.company} · ` : ""}
                    {request.department || "—"} · {formatManagerSubmittedDate(request.submittedAt)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                    {request.requestType}
                  </span>
                </td>
                <td className="px-4 py-4 text-slate-700">{request.dateOfIncident}</td>
                <td className="px-4 py-4 text-slate-700">
                  <p>{formatManagerTime(request.timeIn)}</p>
                  <p className="mt-1">{formatManagerTime(request.timeOut)}</p>
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-900">{request.approvedBy || "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRecordDate(request.approvedOn)}
                  </p>
                </td>
                <td className="px-4 py-4">
                  {!readOnly && mode === "pending" && !isChecked && (
                    <HrCheckAction request={request} employeeType={employeeType} />
                  )}

                  {!readOnly && mode === "all" && !isChecked && (
                    <span className="text-sm text-slate-400">Pending</span>
                  )}

                  {(readOnly || mode === "checked" || (mode === "all" && isChecked)) && (
                    <CheckedStatus
                      archivedBy={request.archivedBy}
                      archivedAt={request.archivedAt}
                    />
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
