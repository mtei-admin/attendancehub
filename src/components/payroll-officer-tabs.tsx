import Link from "next/link";

import type { PayrollOfficerTab } from "@/lib/hr-portal-access";

type PayrollOfficerTabsProps = {
  activeTab: PayrollOfficerTab;
  rfCount: number;
  confiPendingCount: number;
  confiCheckedCount: number;
  confiAllCount: number;
  companyCount: number;
  rfPeriodId?: string;
};

const UTILITY_TABS: { id: PayrollOfficerTab; label: string }[] = [
  { id: "employees", label: "Employees" },
  { id: "managers", label: "Managers" },
  { id: "verifiers", label: "Verifiers" },
  { id: "companies", label: "Companies" },
  { id: "ot-summary", label: "OT Summary" },
  { id: "record-logs", label: "Record logs" },
];

function buildHref(tab: PayrollOfficerTab, rfPeriodId?: string): string {
  const params = new URLSearchParams({ tab });
  if (tab === "rf" && rfPeriodId) {
    params.set("period", rfPeriodId);
  }
  return `/hr?${params.toString()}`;
}

export function PayrollOfficerTabs({
  activeTab,
  rfCount,
  confiPendingCount,
  confiCheckedCount,
  confiAllCount,
  companyCount,
  rfPeriodId,
}: PayrollOfficerTabsProps) {
  const confiActive =
    activeTab === "confi-pending" || activeTab === "confi-checked" || activeTab === "confi-all";

  const confiSubTabs: {
    id: PayrollOfficerTab;
    label: string;
    count: number;
    countClass: string;
  }[] = [
    {
      id: "confi-pending",
      label: "Pending",
      count: confiPendingCount,
      countClass: "bg-red-100 text-red-600",
    },
    {
      id: "confi-checked",
      label: "Checked",
      count: confiCheckedCount,
      countClass: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "confi-all",
      label: "All records",
      count: confiAllCount,
      countClass: "bg-slate-100 text-slate-500",
    },
  ];

  return (
    <>
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 md:px-6">
          <Link
            href={buildHref("rf", rfPeriodId)}
            className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
              activeTab === "rf" ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            R&F
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
              {rfCount}
            </span>
            {activeTab === "rf" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />
            )}
          </Link>

          <Link
            href={buildHref("confi-pending")}
            className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
              confiActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Confi
            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-600">
              {confiPendingCount}
            </span>
            {confiActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />
            )}
          </Link>

          {UTILITY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = tab.id === "companies" ? companyCount : null;

            return (
              <Link
                key={tab.id}
                href={buildHref(tab.id)}
                className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
                  isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {count !== null && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                    {count}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {confiActive && (
        <nav className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 md:px-6">
            {confiSubTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <Link
                  key={tab.id}
                  href={buildHref(tab.id)}
                  className={`relative flex shrink-0 items-center gap-2 py-3 text-sm font-medium transition ${
                    isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${tab.countClass}`}
                  >
                    {tab.count}
                  </span>
                  {isActive && (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-600" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
