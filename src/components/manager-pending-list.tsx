import { updateStatusAction } from "@/actions/requests";
import type { AttendanceRequest } from "@/lib/schema";

import { inputClassName } from "./form-field";
import {
  formatManagerSubmittedDate,
  formatManagerTime,
  getEmployeeTypeBadgeClass,
  getEmployeeTypeLabel,
} from "./manager-request-utils";
import { RejectRequestButton } from "./reject-request-button";

type ManagerPendingListProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
};

function needsApproveHrs(requestType: string): boolean {
  return requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
}

export function ManagerPendingList({
  requests,
  employeeTypeLookup,
}: ManagerPendingListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-brand-500">📋</div>
        <p className="text-sm text-slate-400">No pending requests</p>
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
              const employeeType =
                employeeTypeLookup[`${request.department ?? ""}::${request.employeeName}`];
              const typeLabel = getEmployeeTypeLabel(employeeType);
              const showApproveHrs = needsApproveHrs(request.requestType);

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
                        <button
                          type="submit"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
                          title="Approve"
                        >
                          ✓
                        </button>
                      </form>
                      <RejectRequestButton
                        refId={request.refId}
                        action={updateStatusAction}
                        variant="icon"
                        hiddenFields={{ status: "Rejected" }}
                      />
                    </div>
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
