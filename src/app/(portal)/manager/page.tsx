import { FlashMessage } from "@/components/flash-message";
import { ManagerCutoffFilter } from "@/components/manager-cutoff-filter";
import { ManagerGroupedList } from "@/components/manager-grouped-list";
import { ManagerTabs } from "@/components/manager-tabs";
import { getSession } from "@/lib/auth";
import {
  buildManagerGroupedRequests,
  filterRequestsForManagerRange,
  parseManagerCutoffRange,
} from "@/lib/manager-grouping";
import { listPayrollCutoffRules } from "@/lib/ot-settings";
import { getHistoryRequests, getPendingRequests } from "@/lib/requests";
import { buildEmployeeTypeLookup, listEmployees } from "@/lib/roster";
import { redirect } from "next/navigation";

type ManagerPageProps = {
  searchParams: Promise<{
    tab?: string;
    range?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "history" ? "history" : "pending";
  const range = parseManagerCutoffRange(params.range);

  const session = await getSession();
  if (!session) redirect("/");

  const departmentFilter =
    session.role === "Manager"
      ? session.company && session.department
        ? { company: session.company, department: session.department }
        : undefined
      : undefined;

  const [pendingRequests, historyRequests, roster, cutoffRules] =
    session.role === "Manager" && !departmentFilter
      ? [[], [], [], []]
      : await Promise.all([
          getPendingRequests(departmentFilter),
          getHistoryRequests(departmentFilter),
          listEmployees(true),
          listPayrollCutoffRules(),
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

  return (
    <>
      <ManagerTabs
        activeTab={activeTab}
        range={range}
        pendingCount={visiblePending.length}
        historyCount={visibleHistory.length}
      />

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
    </>
  );
}
