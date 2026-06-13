import type { AttendanceRequest } from "@/lib/schema";

type ManagerHistoryListProps = {
  requests: AttendanceRequest[];
};

export function ManagerHistoryList({ requests }: ManagerHistoryListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-slate-400">📋</div>
        <p className="text-sm text-slate-400">No request history yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 py-2">
      {requests.map((request) => (
        <article
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-4 py-4"
        >
          <div>
            <p className="font-medium text-slate-900">{request.employeeName}</p>
            <p className="mt-1 text-sm text-slate-500">
              {request.refId} · {request.requestType} · {request.dateOfIncident}
            </p>
          </div>
          <div className="text-right">
            <StatusBadge status={request.status} />
            {request.approvedOn && (
              <p className="mt-1 text-xs text-slate-400">
                {request.approvedOn.toLocaleDateString()}
              </p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "Approved"
      ? "bg-green-100 text-green-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}
