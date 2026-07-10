import { groupAttendanceRequestsByPlacement } from "@/lib/admin-stats";
import { HrRecordsGroupedList } from "@/components/hr-records-grouped-list";
import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";

import { HrRecordRow } from "./hr-record-row";

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

const FLAT_HEADERS = [
  "Employee",
  "Type",
  "Date",
  "Time in / Time out",
  "Approved by",
  "Action",
  "Remarks",
];

function buildEditHrefByRefId(
  requests: AttendanceRequest[],
  getEditHref?: (refId: string) => string,
): Record<string, string> {
  if (!getEditHref) return {};
  const hrefs: Record<string, string> = {};
  for (const request of requests) {
    hrefs[request.refId] = getEditHref(request.refId);
  }
  return hrefs;
}

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
        groupedRequests={JSON.parse(JSON.stringify(groupedRequests))}
        employeeTypeLookup={employeeTypeLookup}
        mode={mode}
        readOnly={readOnly}
        collapseStorageKey={storageKey}
        editableRefIds={Array.from(editableRefIds ?? [])}
        editHrefByRefId={buildEditHrefByRefId(requests, getEditHref)}
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
