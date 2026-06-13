import Link from "next/link";

type HrTabsProps = {
  activeTab: "records" | "archived" | "employees" | "managers";
  recordCount: number;
  archivedCount: number;
};

export function HrTabs({ activeTab, recordCount, archivedCount }: HrTabsProps) {
  const tabs = [
    { id: "records" as const, label: "Approved Records", count: recordCount },
    { id: "archived" as const, label: "Archived", count: archivedCount },
    { id: "employees" as const, label: "Employees", count: null },
    { id: "managers" as const, label: "Managers", count: null },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/hr?tab=${tab.id}`}
              className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
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
