import { saveEmployeeRosterAction, saveManagerAction } from "@/actions/hr";
import { FlashMessage } from "@/components/flash-message";
import { HrRecordsTable } from "@/components/hr-records-table";
import { HrTabs } from "@/components/hr-tabs";
import { MetricCard } from "@/components/metric-card";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { listDepartments } from "@/lib/departments";
import { getArchivedRequests, getApprovedRequests } from "@/lib/requests";
import { listEmployees } from "@/lib/roster";
import { listUsersByRole } from "@/lib/users";

type HrPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
};

export default async function HrPage({ searchParams }: HrPageProps) {
  const params = await searchParams;
  const activeTab =
    params.tab === "archived" ||
    params.tab === "employees" ||
    params.tab === "managers"
      ? params.tab
      : "records";
  const editId = params.edit ? Number(params.edit) : undefined;

  const [approvedRequests, archivedRequests, employees, departments, managers] =
    await Promise.all([
      getApprovedRequests(),
      getArchivedRequests(),
      listEmployees(),
      listDepartments(),
      listUsersByRole("Manager"),
    ]);

  const totalApproved = approvedRequests.length;
  const lateCount = approvedRequests.filter((r) => r.requestType === "Late/Undertime").length;
  const absentCount = approvedRequests.filter((r) => r.requestType === "Absent/Leave").length;
  const overtimeCount = approvedRequests.filter((r) => r.requestType === "Overtime").length;

  return (
    <>
      <HrTabs
        activeTab={activeTab}
        recordCount={approvedRequests.length}
        archivedCount={archivedRequests.length}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "records" && (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                HR Analytics — Approved Records
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review approved attendance records and archive processed entries for payroll.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Total Approved" value={totalApproved} />
              <MetricCard label="Late/Undertime" value={lateCount} />
              <MetricCard label="Absent/Leave" value={absentCount} />
              <MetricCard label="Overtime" value={overtimeCount} />
            </div>

            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Active Records</h3>
                {approvedRequests.length > 0 && (
                  <a
                    href="/api/export/csv"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Download CSV for Payroll
                  </a>
                )}
              </div>
              <HrRecordsTable
                requests={approvedRequests}
                mode="active"
                emptyMessage="No active approved records to display."
              />
            </section>
          </>
        )}

        {activeTab === "archived" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Archived Records</h2>
              <p className="mt-1 text-sm text-slate-500">
                Records archived after payroll processing. Restore if needed.
              </p>
            </div>
            <HrRecordsTable
              requests={archivedRequests}
              mode="archived"
              emptyMessage="No archived records yet."
            />
          </section>
        )}

        {activeTab === "employees" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Employee Roster</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add or update employees available in the submission form.
              </p>
            </div>
            <RosterPanel
              employees={employees}
              departments={departments}
              saveAction={saveEmployeeRosterAction}
              editId={editId}
              basePath="/hr"
              tab="employees"
            />
          </section>
        )}

        {activeTab === "managers" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Manager Accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add or update manager login accounts and department assignments.
              </p>
            </div>
            <PortalUserPanel
              users={managers}
              departments={departments}
              saveAction={saveManagerAction}
              role="Manager"
              editId={editId}
              basePath="/hr"
              tab="managers"
            />
          </section>
        )}
      </div>
    </>
  );
}

