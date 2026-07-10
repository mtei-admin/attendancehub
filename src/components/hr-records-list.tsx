import { HrCheckAction } from "@/components/hr-check-action";
import { groupAttendanceRequestsByPlacement } from "@/lib/admin-stats";
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
  grouped?: boolean;
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

function HrRecordRow({
  request,
  employeeType,
  mode,
  readOnly,
  showEmployeeMeta = true,
}: {
  request: AttendanceRequest;
  employeeType?: string;
  mode: HrRecordsListProps["mode"];
  readOnly: boolean;
  showEmployeeMeta?: boolean;
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
        {!readOnly && mode === "pending" && !isChecked && (
          <HrCheckAction request={request} />
        )}

        {!readOnly && mode === "all" && !isChecked && (
          <span className="text-sm text-slate-400">Pending</span>
        )}

        {(readOnly || mode === "checked" || (mode === "all" && isChecked)) && (
          <CheckedStatus archivedBy={request.archivedBy} archivedAt={request.archivedAt} />
        )}
      </td>
      <td className="max-w-xs px-4 py-4 text-slate-600">{request.reason}</td>
    </tr>
  );
}

const GROUPED_HEADERS = ["Type", "Date", "Time in / Time out", "Approved by", "Action", "Remarks"];
const FLAT_HEADERS = ["Employee", ...GROUPED_HEADERS];

export function HrRecordsList({
  requests,
  employeeTypeLookup,
  mode,
  emptyMessage = "No records found.",
  readOnly = false,
  grouped = false,
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

    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {groupedRequests.map((companyGroup) => (
            <div key={companyGroup.company}>
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-5 py-3">
                <h3 className="text-sm font-semibold text-slate-900">{companyGroup.company}</h3>
              </div>

              {companyGroup.departments.map((departmentGroup) => (
                <div key={`${companyGroup.company}-${departmentGroup.department}`}>
                  <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5 pl-8">
                    <h4 className="text-sm font-medium text-slate-700">{departmentGroup.department}</h4>
                  </div>

                  {departmentGroup.employees.map((employeeGroup) => {
                    const employeeType =
                      employeeTypeLookup[requestEmployeeKey(employeeGroup.requests[0]!)];
                    const typeLabel = getEmployeeTypeLabel(employeeType);

                    return (
                      <div
                        key={`${companyGroup.company}-${departmentGroup.department}-${employeeGroup.employeeName}`}
                        className="border-b border-slate-50"
                      >
                        <div className="flex flex-wrap items-center gap-2 bg-white px-5 py-3 pl-10">
                          <h5 className="text-sm font-semibold text-slate-900">
                            {employeeGroup.employeeName}
                          </h5>
                          {typeLabel && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getEmployeeTypeBadgeClass(employeeType)}`}
                            >
                              {typeLabel}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {employeeGroup.requests.length} slip
                            {employeeGroup.requests.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="border-b border-slate-100 bg-slate-50/80">
                              <tr>
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
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
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
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
