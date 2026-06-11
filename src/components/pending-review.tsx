import { updateStatusAction } from "@/actions/requests";
import type { AttendanceRequest } from "@/lib/schema";

type PendingReviewProps = {
  pendingRequests: AttendanceRequest[];
};

export function PendingReview({ pendingRequests }: PendingReviewProps) {
  if (pendingRequests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No pending requests to review.
      </div>
    );
  }

  const selected = pendingRequests[0];

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-medium text-slate-700">Select Pending Request</span>
        <select
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          defaultValue={selected.refId}
          disabled
        >
          {pendingRequests.map((request) => (
            <option key={request.refId} value={request.refId}>
              {request.refId}
            </option>
          ))}
        </select>
      </label>

      {pendingRequests.map((request) => (
        <details
          key={request.refId}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          open={request.refId === selected.refId}
        >
          <summary className="cursor-pointer font-medium text-slate-900">
            {request.refId} — {request.employeeName}
          </summary>

          <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm text-slate-600">
            <p>
              <span className="font-medium text-slate-800">Employee:</span>{" "}
              {request.employeeName}
            </p>
            <p>
              <span className="font-medium text-slate-800">Type:</span>{" "}
              {request.requestType}
            </p>
            <p>
              <span className="font-medium text-slate-800">Date:</span>{" "}
              {request.dateOfIncident}
            </p>
            <p>
              <span className="font-medium text-slate-800">Time In:</span>{" "}
              {request.timeIn || "—"}
            </p>
            <p>
              <span className="font-medium text-slate-800">OT Hours:</span>{" "}
              {request.otHrs || "—"}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium text-slate-800">Reason:</span>{" "}
              {request.reason}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <form action={updateStatusAction}>
              <input type="hidden" name="ref_id" value={request.refId} />
              <input type="hidden" name="status" value="Approved" />
              <button
                type="submit"
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Approve
              </button>
            </form>

            <form action={updateStatusAction}>
              <input type="hidden" name="ref_id" value={request.refId} />
              <input type="hidden" name="status" value="Rejected" />
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Reject
              </button>
            </form>
          </div>
        </details>
      ))}
    </div>
  );
}
