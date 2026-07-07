import Link from "next/link";

type VerificationTabsProps = {
  activeTab: "pending" | "verified";
  pendingCount: number;
  verifiedCount: number;
};

export function VerificationTabs({
  activeTab,
  pendingCount,
  verifiedCount,
}: VerificationTabsProps) {
  const tabs = [
    { id: "pending" as const, label: "Pending verification", count: pendingCount },
    { id: "verified" as const, label: "Verified", count: verifiedCount },
  ];

  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl gap-8 px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              href={`/verification?tab=${tab.id}`}
              className={`relative flex items-center gap-2 py-4 text-sm font-medium transition ${
                isActive ? "text-brand-600" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
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
