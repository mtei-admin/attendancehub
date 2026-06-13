import { archiveRequestAction, unarchiveRequestAction } from "@/actions/hr";
import type { AttendanceRequest } from "@/lib/schema";

type HrRecordsTableProps = {
  requests: AttendanceRequest[];
  mode: "active" | "archived";
  emptyMessage?: string;
};

export function HrRecordsTable({
  requests,
  mode,
  emptyMessage = "No records found.",
}: HrRecordsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  const action = mode === "active" ? archiveRequestAction : unarchiveRequestAction;
  const actionLabel = mode === "active" ? "Archive" : "Restore";
  const actionClass =
    mode === "active"
      ? "border-slate-200 text-slate-600 hover:bg-slate-50"
      : "border-emerald-200 text-emerald-700 hover:bg-emerald-50";

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Ref ID",
              "Employee",
              "Department",
              "Type",
              "Date of Application",
              "Approved By",
              "Approved On",
              mode === "archived" ? "Archived By" : null,
              "Action",
            ]
              .filter(Boolean)
              .map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-semibold text-slate-600"
                >
                  {header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {requests.map((request) => (
            <tr key={request.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{request.refId}</td>
              <td className="px-4 py-3 text-slate-600">{request.employeeName}</td>
              <td className="px-4 py-3 text-slate-600">{request.department || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{request.requestType}</td>
              <td className="px-4 py-3 text-slate-600">{request.dateOfIncident}</td>
              <td className="px-4 py-3 text-slate-600">{request.approvedBy || "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {request.approvedOn?.toLocaleString() ?? "—"}
              </td>
              {mode === "archived" && (
                <td className="px-4 py-3 text-slate-600">{request.archivedBy || "—"}</td>
              )}
              <td className="px-4 py-3">
                <form action={action}>
                  <input type="hidden" name="ref_id" value={request.refId} />
                  <button
                    type="submit"
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${actionClass}`}
                  >
                    {actionLabel}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
