import Link from "next/link";

import type {
  AdminDashboardView,
  AdminDashboardStats,
  GroupedCompanyRoster,
  GroupedCompanySlips,
} from "@/lib/admin-stats";

import { AdminDashboardGroupedList } from "./admin-dashboard-grouped-list";

type AdminDashboardProps = {
  stats: AdminDashboardStats;
  activeView?: AdminDashboardView;
  groupedSlips: GroupedCompanySlips[];
  groupedEmployees: GroupedCompanyRoster[];
  viewCount: number;
};

type DashboardCard = {
  id: AdminDashboardView;
  label: string;
  value: number;
  subtext: string;
  valueClass: string;
  ringClass: string;
};

export function AdminDashboard({
  stats,
  activeView,
  groupedSlips,
  groupedEmployees,
  viewCount,
}: AdminDashboardProps) {
  const cards: DashboardCard[] = [
    {
      id: "employees",
      label: "Total employees",
      value: stats.totalEmployees,
      subtext: "Across all departments",
      valueClass: "text-brand-600",
      ringClass: "ring-brand-300",
    },
    {
      id: "pending-verification",
      label: "Pending verification",
      value: stats.pendingVerification,
      subtext: "Awaiting verifier action",
      valueClass: "text-cyan-600",
      ringClass: "ring-cyan-300",
    },
    {
      id: "pending-manager",
      label: "Pending manager approval",
      value: stats.pendingManagerApproval,
      subtext: "Awaiting manager action",
      valueClass: "text-red-600",
      ringClass: "ring-red-300",
    },
    {
      id: "pending-hr",
      label: "Pending HR processing",
      value: stats.pendingHrProcessing,
      subtext: "Approved, not yet checked",
      valueClass: "text-orange-500",
      ringClass: "ring-orange-300",
    },
    {
      id: "all-requests",
      label: "Total requests",
      value: stats.totalRequests,
      subtext: "All time",
      valueClass: "text-emerald-600",
      ringClass: "ring-emerald-300",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const isActive = activeView === card.id;
          const href = isActive
            ? "/admin?tab=dashboard"
            : `/admin?tab=dashboard&view=${card.id}`;

          return (
            <Link
              key={card.id}
              href={href}
              className={`block rounded-xl border bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md ${
                isActive
                  ? `border-brand-300 ring-2 ${card.ringClass}`
                  : "border-slate-200"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {card.label}
              </p>
              <p className={`mt-2 text-4xl font-semibold ${card.valueClass}`}>{card.value}</p>
              <p className="mt-2 text-sm text-slate-500">{card.subtext}</p>
              <p className="mt-3 text-xs font-medium text-brand-600">
                {isActive ? "Showing list below" : "Click to view list"}
              </p>
            </Link>
          );
        })}
      </section>

      {activeView && (
        <AdminDashboardGroupedList
          view={activeView}
          groupedSlips={groupedSlips}
          groupedEmployees={groupedEmployees}
          totalCount={viewCount}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Requests by department</h2>
        <div className="max-h-[min(50vh,600px)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
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
