"use client";

import Link from "next/link";

export type EmployeeSection = "file" | "records";

type EmployeeTabsProps = {
  activeSection: EmployeeSection;
};

export function EmployeeTabs({ activeSection }: EmployeeTabsProps) {
  const tabs: { id: EmployeeSection; label: string }[] = [
    { id: "file", label: "File a request" },
    { id: "records", label: "My records" },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white rounded-t-xl">
      <div className="flex gap-6 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/employee?section=${tab.id}`}
              className={`relative shrink-0 py-4 text-sm font-medium transition ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
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
