import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";

import {
  formatManagerSubmittedDate,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";

type VerificationVerifiedListProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
};

export function VerificationVerifiedList({
  requests,
  employeeTypeLookup,
}: VerificationVerifiedListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-slate-400">✅</div>
        <p className="text-sm text-slate-400">No verified requests awaiting manager approval</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Employee",
                "Type",
                "Date",
                "Verified by",
                "Verified on",
                "Note",
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
              const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
              const typeLabel = getEmployeeTypeLabel(employeeType);

              return (
                <tr key={request.id} className="align-top hover:bg-slate-50/60">
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
                  <td className="px-4 py-4 text-slate-700">{request.verifiedBy ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-700">
                    {request.verifiedOn
                      ? formatManagerSubmittedDate(request.verifiedOn)
                      : "—"}
                  </td>
                  <td className="max-w-xs px-4 py-4 text-slate-600">
                    {request.verificationNote || "—"}
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
