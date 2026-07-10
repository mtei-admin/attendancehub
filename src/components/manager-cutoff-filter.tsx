import Link from "next/link";

import type { ManagerCutoffRange } from "@/lib/manager-grouping";

import type { ManagerTab } from "./manager-tabs";

type ManagerCutoffFilterProps = {
  activeTab: Exclude<ManagerTab, "file">;
  range: ManagerCutoffRange;
};

export function ManagerCutoffFilter({ activeTab, range }: ManagerCutoffFilterProps) {
  const options: { id: ManagerCutoffRange; label: string }[] = [
    { id: "current", label: "Current cutoff" },
    { id: "all", label: "All cutoffs" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Show
      </span>
      {options.map((option) => {
        const isActive = range === option.id;
        return (
          <Link
            key={option.id}
            href={`/manager?tab=${activeTab}&range=${option.id}`}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
