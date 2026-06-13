import { updateStatusAction } from "@/actions/requests";
import type { AttendanceRequest } from "@/lib/schema";

type ManagerPendingListProps = {
  requests: AttendanceRequest[];
};

export function ManagerPendingList({ requests }: ManagerPendingListProps) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-3 text-2xl text-brand-500">📋</div>
        <p className="text-sm text-slate-400">No pending requests</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 py-6">
      {requests.map((request) => (
        <article
          key={request.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{request.employeeName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {request.refId} · {request.requestType} · {request.dateOfIncident}
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              Pending
            </span>
          </div>

          <dl className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            {request.department && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Department</dt>
                <dd>{request.department}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Time in</dt>
              <dd>{request.timeIn || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Time out</dt>
              <dd>{request.timeOut || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-400">Reason</dt>
              <dd>{request.reason}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <form action={updateStatusAction}>
              <input type="hidden" name="ref_id" value={request.refId} />
              <input type="hidden" name="status" value="Approved" />
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Approve
              </button>
            </form>
            <form action={updateStatusAction}>
              <input type="hidden" name="ref_id" value={request.refId} />
              <input type="hidden" name="status" value="Rejected" />
              <button
                type="submit"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reject
              </button>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}
