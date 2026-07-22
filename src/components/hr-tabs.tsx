import Link from "next/link";

export type HrTab = "pending" | "checked" | "all" | "employees" | "managers" | "verifiers" | "companies" | "ot-summary" | "record-logs";

type HrTabsProps = {
  activeTab: HrTab;
  pendingCount: number;
  checkedCount: number;
  allCount: number;
  companyCount: number;
  /** Preserve date range when switching between Checked / All records. */
  fromDate?: string;
  toDate?: string;
};

export function HrTabs({
  activeTab,
  pendingCount,
  checkedCount,
  allCount,
  companyCount,
  fromDate,
  toDate,
}: HrTabsProps) {
  const tabs: {
    id: HrTab;
    label: string;
    count: number | null;
    countClass: string;
  }[] = [
    {
      id: "pending",
      label: "Pending",
      count: pendingCount,
      countClass: "bg-red-100 text-red-600",
    },
    {
      id: "checked",
      label: "Checked",
      count: checkedCount,
      countClass: "bg-emerald-100 text-emerald-700",
    },
    {
      id: "all",
      label: "All records",
      count: allCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    { id: "employees", label: "Employees", count: null, countClass: "" },
    { id: "managers", label: "Managers", count: null, countClass: "" },
    { id: "verifiers", label: "Verifiers", count: null, countClass: "" },
    {
      id: "companies",
      label: "Companies",
      count: companyCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    { id: "ot-summary", label: "OT Summary", count: null, countClass: "" },
    { id: "record-logs", label: "Record logs", count: null, countClass: "" },
  ];

  function tabHref(tab: HrTab): string {
    const params = new URLSearchParams({ tab });
    if (fromDate && toDate && (tab === "all" || tab === "checked")) {
      params.set("from", fromDate);
      params.set("to", toDate);
    }
    return `/hr?${params.toString()}`;
  }

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={tabHref(tab.id)}
              className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${tab.countClass}`}
                >
                  {tab.count}
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
  );
}
