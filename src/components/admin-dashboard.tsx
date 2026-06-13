import type { AdminDashboardStats } from "@/lib/admin-stats";

type AdminDashboardProps = {
  stats: AdminDashboardStats;
};

export function AdminDashboard({ stats }: AdminDashboardProps) {
  const cards = [
    {
      label: "Total employees",
      value: stats.totalEmployees,
      subtext: "Across all departments",
      valueClass: "text-brand-600",
    },
    {
      label: "Pending manager approval",
      value: stats.pendingManagerApproval,
      subtext: "Awaiting manager action",
      valueClass: "text-red-600",
    },
    {
      label: "Pending HR processing",
      value: stats.pendingHrProcessing,
      subtext: "Approved, not yet checked",
      valueClass: "text-orange-500",
    },
    {
      label: "Total requests",
      value: stats.totalRequests,
      subtext: "All time",
      valueClass: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {card.label}
            </p>
            <p className={`mt-2 text-4xl font-semibold ${card.valueClass}`}>{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.subtext}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Requests by department</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Department", "Total", "Pending", "Approved", "Rejected"].map((header) => (
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
              {stats.byDepartment.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No request data yet.
                  </td>
                </tr>
              ) : (
                stats.byDepartment.map((row) => (
                  <tr key={row.department} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.department}</td>
                    <td className="px-4 py-3 text-slate-700">{row.total}</td>
                    <td className="px-4 py-3 text-slate-700">{row.pending}</td>
                    <td className="px-4 py-3 text-slate-700">{row.approved}</td>
                    <td className="px-4 py-3 text-slate-700">{row.rejected}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
