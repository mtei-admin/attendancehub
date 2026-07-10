import { FlashMessage } from "@/components/flash-message";
import { ManagerCutoffFilter } from "@/components/manager-cutoff-filter";
import { ManagerGroupedList } from "@/components/manager-grouped-list";
import { ManagerSlipForm } from "@/components/manager-slip-form";
import { ManagerTabs, type ManagerTab } from "@/components/manager-tabs";
import { getSession } from "@/lib/auth";
import {
  buildManagerGroupedRequests,
  filterRequestsForManagerRange,
  parseManagerCutoffRange,
} from "@/lib/manager-grouping";
import { listPayrollCutoffRules } from "@/lib/ot-settings";
import { getHistoryRequests, getPendingRequests } from "@/lib/requests";
import { buildEmployeeTypeLookup, getEmployeeByPlacement, listEmployees } from "@/lib/roster";
import { redirect } from "next/navigation";

type ManagerPageProps = {
  searchParams: Promise<{
    tab?: string;
    range?: string;
    success?: string;
    error?: string;
  }>;
};

function resolveTab(tab?: string): ManagerTab {
  if (tab === "file" || tab === "history") return tab;
  return "pending";
}

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const range = parseManagerCutoffRange(params.range);

  const session = await getSession();
  if (!session) redirect("/");

  const company = session.company?.trim() ?? "";
  const department = session.department?.trim() ?? "";
  const managerName = session.fullName.trim();

  const departmentFilter =
    session.role === "Manager"
      ? company
        ? department
          ? { company, department }
          : { company }
        : undefined
      : undefined;

  const [pendingRequests, historyRequests, roster, cutoffRules, managerRosterEntry] =
    session.role === "Manager" && !company
      ? [[], [], [], [], null]
      : await Promise.all([
          getPendingRequests(departmentFilter),
          getHistoryRequests(departmentFilter),
          listEmployees(true),
          listPayrollCutoffRules(),
          company && department && managerName
            ? getEmployeeByPlacement(company, department, managerName)
            : Promise.resolve(null),
        ]);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);

  const visiblePending = filterRequestsForManagerRange(
    pendingRequests,
    range,
    cutoffRules,
    employeeTypeLookup,
  );
  const visibleHistory = filterRequestsForManagerRange(
    historyRequests,
    range,
    cutoffRules,
    employeeTypeLookup,
  );

  const groupedPending = buildManagerGroupedRequests(
    pendingRequests,
    range,
    cutoffRules,
    employeeTypeLookup,
  );
  const groupedHistory = buildManagerGroupedRequests(
    historyRequests,
    range,
    cutoffRules,
    employeeTypeLookup,
  );

  const emptyPendingMessage =
    range === "current"
      ? "No pending requests in the current cutoff."
      : "No pending requests to display.";
  const emptyHistoryMessage =
    range === "current"
      ? "No request history in the current cutoff."
      : "No request history to display.";

  const canFileOwnSlip = Boolean(
    session.role === "Manager" && company && department && managerRosterEntry,
  );

  return (
    <>
      <ManagerTabs
        activeTab={activeTab}
        range={range}
        pendingCount={visiblePending.length}
        historyCount={visibleHistory.length}
      />

      {activeTab === "file" ? (
        <>
          <div className="mx-auto max-w-6xl px-4 py-2 md:px-6">
            <FlashMessage success={params.success} error={params.error} />
          </div>
          {canFileOwnSlip ? (
            <ManagerSlipForm
              company={company}
              department={department}
              employeeName={managerName}
            />
          ) : (
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {session.role !== "Manager"
                  ? "Only manager accounts can file slips here."
                  : !company || !department
                    ? "Your manager account has no company or department assigned. Contact HR."
                    : "Your manager account name must match your name on the employee roster before you can file a slip."}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <ManagerCutoffFilter activeTab={activeTab} range={range} />

          <div className="py-2">
            <FlashMessage success={params.success} error={params.error} />
          </div>

          {activeTab === "pending" ? (
            <ManagerGroupedList
              grouped={groupedPending}
              mode="pending"
              emptyMessage={emptyPendingMessage}
            />
          ) : (
            <ManagerGroupedList
              grouped={groupedHistory}
              mode="history"
              emptyMessage={emptyHistoryMessage}
            />
          )}
        </div>
      )}
    </>
  );
}
