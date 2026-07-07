import Link from "next/link";

import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";
import { isOwnSlip } from "@/lib/verification";

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
};

export function VerificationPendingList({
  requests,
  employeeTypeLookup,
  verifierFullName,
  panelHref,
  editRefId,
}: VerificationPendingListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-brand-500">✅</div>
        <p className="text-sm text-slate-400">No requests awaiting verification</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {["Employee", "Type", "Date", "Time in", "Time out", "Action", "Remarks"].map(
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
            {requests.map((request) => {
              const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
              const typeLabel = getEmployeeTypeLabel(employeeType);
              const ownSlip = isOwnSlip(verifierFullName, request.employeeName);
              const isEditing = editRefId === request.refId;

              return (
                <tr
                  key={request.id}
                  className={`align-top hover:bg-slate-50/60 ${isEditing ? "bg-cyan-50/40" : ""}`}
                >
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {request.employeeName}
                      </span>
                      {typeLabel && (
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEmployeeTypeBadgeClass(employeeType)}`}
                        >
                          {typeLabel}
                        </span>
                      )}
                      {ownSlip && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Own slip
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
                  <td className="px-4 py-4 text-slate-700">{formatManagerTime(request.timeIn)}</td>
                  <td className="px-4 py-4 text-slate-700">{formatManagerTime(request.timeOut)}</td>
                  <td className="px-4 py-4">
                    {ownSlip ? (
                      <span className="text-xs text-slate-400">Cannot verify</span>
                    ) : (
                      <Link
                        href={`${panelHref}&edit=${encodeURIComponent(request.refId)}`}
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
    </div>
  );
}
