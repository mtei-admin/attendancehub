import { MetricCard } from "@/components/metric-card";
import { RequestTable } from "@/components/request-table";
import { getApprovedRequests } from "@/lib/requests";

export default async function HrPage() {
  const approvedRequests = await getApprovedRequests();

  const totalApproved = approvedRequests.length;
  const lateCount = approvedRequests.filter((r) => r.requestType === "Late").length;
  const absentCount = approvedRequests.filter((r) => r.requestType === "Absent").length;
  const leaveCount = approvedRequests.filter((r) => r.requestType === "Leave").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">HR Analytics — Approved Records</h2>
        <p className="mt-1 text-sm text-slate-500">
          Read-only view of approved attendance records for payroll processing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Approved" value={totalApproved} />
        <MetricCard label="Late" value={lateCount} />
        <MetricCard label="Absent" value={absentCount} />
        <MetricCard label="Leave" value={leaveCount} />
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Approved Records</h3>
          {approvedRequests.length > 0 && (
            <a
              href="/api/export/csv"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Download CSV for Payroll
            </a>
          )}
        </div>
        <RequestTable
          requests={approvedRequests}
          emptyMessage="No approved records to display."
        />
      </section>
    </div>
  );
}
