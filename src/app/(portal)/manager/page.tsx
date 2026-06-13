import { FlashMessage } from "@/components/flash-message";
import { ManagerHistoryList } from "@/components/manager-history-list";
import { ManagerPendingList } from "@/components/manager-pending-list";
import { ManagerTabs } from "@/components/manager-tabs";
import { getHistoryRequests, getPendingRequests } from "@/lib/requests";

type ManagerPageProps = {
  searchParams: Promise<{
    tab?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function ManagerPage({ searchParams }: ManagerPageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "history" ? "history" : "pending";

  const [pendingRequests, historyRequests] = await Promise.all([
    getPendingRequests(),
    getHistoryRequests(),
  ]);

  return (
    <>
      <ManagerTabs
        activeTab={activeTab}
        pendingCount={pendingRequests.length}
        historyCount={historyRequests.length}
      />

      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="py-2">
          <FlashMessage success={params.success} error={params.error} />
        </div>

        {activeTab === "pending" ? (
          <ManagerPendingList requests={pendingRequests} />
        ) : (
          <ManagerHistoryList requests={historyRequests} />
        )}
      </div>
    </>
  );
}
