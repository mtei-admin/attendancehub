import { FlashMessage } from "@/components/flash-message";
import { MetricCard } from "@/components/metric-card";
import { PendingReview } from "@/components/pending-review";
import { RequestTable } from "@/components/request-table";
import { getAllRequests, getPendingRequests } from "@/lib/requests";

type ManagerPageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = await searchParams;
  const [allRequests, pendingRequests] = await Promise.all([
    getAllRequests(),
    getPendingRequests(),
  ]);

  const total = allRequests.length;
  const pending = allRequests.filter((r) => r.status === "Pending").length;
  const approved = allRequests.filter((r) => r.status === "Approved").length;
  const rejected = allRequests.filter((r) => r.status === "Rejected").length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Manager Dashboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review pending requests and take action on employee submissions.
        </p>
      </div>

      <FlashMessage success={params.success} error={params.error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Requests" value={total} />
        <MetricCard label="Pending" value={pending} />
        <MetricCard label="Approved" value={approved} />
        <MetricCard label="Rejected" value={rejected} />
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">All Requests</h3>
        <RequestTable requests={allRequests} />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Review Pending Requests</h3>
        <PendingReview pendingRequests={pendingRequests} />
      </section>
    </div>
  );
}
