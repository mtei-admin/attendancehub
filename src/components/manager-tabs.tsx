import Link from "next/link";

import type { ManagerCutoffRange } from "@/lib/manager-grouping";

export type ManagerTab = "file" | "pending" | "history";

type ManagerTabsProps = {
  activeTab: ManagerTab;
  range: ManagerCutoffRange;
  pendingCount: number;
  historyCount: number;
  showFileTab?: boolean;
};

export function ManagerTabs({
  activeTab,
  range,
  pendingCount,
  historyCount,
  showFileTab = true,
}: ManagerTabsProps) {
  const tabs: { id: ManagerTab; label: string; count?: number }[] = [
    ...(showFileTab ? [{ id: "file" as const, label: "File a slip" }] : []),
    { id: "pending", label: "Pending", count: pendingCount },
    { id: "history", label: "History", count: historyCount },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const href =
            tab.id === "file"
              ? "/manager?tab=file"
              : `/manager?tab=${tab.id}&range=${range}`;

          return (
            <Link
              key={tab.id}
              href={href}
              className={`relative flex shrink-0 items-center gap-2 py-4 text-sm font-medium transition ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    tab.id === "pending"
                      ? isActive
                        ? "bg-red-100 text-red-600"
                        : "bg-slate-100 text-slate-500"
                      : "bg-slate-100 text-slate-500"
                  }`}
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
