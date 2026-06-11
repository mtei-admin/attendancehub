import type { AttendanceRequest } from "@/lib/schema";

type RequestTableProps = {
  requests: AttendanceRequest[];
  emptyMessage?: string;
};

export function RequestTable({
  requests,
  emptyMessage = "No requests found.",
}: RequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {[
              "Ref ID",
              "Submitted",
              "Employee",
              "Type",
              "Date",
              "Time In",
              "OT Hrs",
              "Reason",
              "Status",
              "Approved By",
              "Approved On",
            ].map((header) => (
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
              <td className="px-4 py-3 text-slate-600">
                {request.submittedAt?.toLocaleString() ?? "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">{request.employeeName}</td>
              <td className="px-4 py-3 text-slate-600">{request.requestType}</td>
              <td className="px-4 py-3 text-slate-600">{request.dateOfIncident}</td>
              <td className="px-4 py-3 text-slate-600">{request.timeIn || "—"}</td>
              <td className="px-4 py-3 text-slate-600">{request.otHrs || "—"}</td>
              <td className="max-w-xs truncate px-4 py-3 text-slate-600">{request.reason}</td>
              <td className="px-4 py-3">
                <StatusBadge status={request.status} />
              </td>
              <td className="px-4 py-3 text-slate-600">{request.approvedBy || "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {request.approvedOn?.toLocaleString() ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : status === "Rejected"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}
