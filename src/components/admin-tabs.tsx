import Link from "next/link";

type AdminTab =
  | "overview"
  | "departments"
  | "employees"
  | "managers"
  | "hr"
  | "credentials";

type AdminTabsProps = {
  activeTab: AdminTab;
};

export function AdminTabs({ activeTab }: AdminTabsProps) {
  const tabs: { id: AdminTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "departments", label: "Departments" },
    { id: "employees", label: "Employees" },
    { id: "managers", label: "Managers" },
    { id: "hr", label: "HR" },
    { id: "credentials", label: "Credentials" },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-6 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/admin?tab=${tab.id}`}
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

export type { AdminTab };
