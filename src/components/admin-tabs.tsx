import Link from "next/link";

export type AdminTab =
  | "dashboard"
  | "employees"
  | "managers"
  | "hr"
  | "companies"
  | "departments"
  | "credentials";

type AdminTabsProps = {
  activeTab: AdminTab;
  employeeCount: number;
  managerCount: number;
  hrCount: number;
  companyCount: number;
  departmentCount: number;
};

export function AdminTabs({
  activeTab,
  employeeCount,
  managerCount,
  hrCount,
  companyCount,
  departmentCount,
}: AdminTabsProps) {
  const tabs: {
    id: AdminTab;
    label: string;
    count: number | null;
    countClass: string;
  }[] = [
    { id: "dashboard", label: "Dashboard", count: null, countClass: "" },
    {
      id: "employees",
      label: "Employee roster",
      count: employeeCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    {
      id: "managers",
      label: "Managers",
      count: managerCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    {
      id: "hr",
      label: "HR accounts",
      count: hrCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    {
      id: "companies",
      label: "Companies",
      count: companyCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    {
      id: "departments",
      label: "Departments",
      count: departmentCount,
      countClass: "bg-slate-100 text-slate-500",
    },
    { id: "credentials", label: "Credentials", count: null, countClass: "" },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-6 overflow-x-auto px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/admin?tab=${tab.id}`}
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
