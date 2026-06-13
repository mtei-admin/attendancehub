import { saveEmployeeRosterAction, saveManagerAction } from "@/actions/hr";
import { FlashMessage } from "@/components/flash-message";
import { HrRecordsList } from "@/components/hr-records-list";
import { HrTabs, type HrTab } from "@/components/hr-tabs";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { getSession } from "@/lib/auth";
import { listDepartments } from "@/lib/departments";
import {
  getAllApprovedRequests,
  getApprovedRequests,
  getArchivedRequests,
} from "@/lib/requests";
import {
  buildEmployeeTypeLookup,
  filterRequestsByHrScope,
  listEmployees,
} from "@/lib/roster";
import { listUsersByRole } from "@/lib/users";
import { redirect } from "next/navigation";

type HrPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
};

function resolveTab(tab?: string): HrTab {
  if (
    tab === "checked" ||
    tab === "all" ||
    tab === "employees" ||
    tab === "managers"
  ) {
    return tab;
  }
  return "pending";
}

export default async function HrPage({ searchParams }: HrPageProps) {
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const editId = params.edit ? Number(params.edit) : undefined;

  const session = await getSession();
  if (!session) redirect("/");

  const hrScope = session.role === "HR" ? session.hrScope : null;

  const [pendingRaw, checkedRaw, allRaw, employees, departments, managers, roster] =
    await Promise.all([
      getApprovedRequests(),
      getArchivedRequests(),
      getAllApprovedRequests(),
      listEmployees(),
      listDepartments(),
      listUsersByRole("Manager"),
      listEmployees(true),
    ]);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const pendingRequests = filterRequestsByHrScope(pendingRaw, employeeTypeLookup, hrScope);
  const checkedRequests = filterRequestsByHrScope(checkedRaw, employeeTypeLookup, hrScope);
  const allRequests = filterRequestsByHrScope(allRaw, employeeTypeLookup, hrScope);

  return (
    <>
      <HrTabs
        activeTab={activeTab}
        pendingCount={pendingRequests.length}
        checkedCount={checkedRequests.length}
        allCount={allRequests.length}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "pending" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={pendingRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="pending"
              emptyMessage="No pending records to review."
            />
          </section>
        )}

        {activeTab === "checked" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={checkedRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="checked"
              emptyMessage="No checked records yet."
            />
          </section>
        )}

        {activeTab === "all" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">All records</h2>
              {allRequests.length > 0 && (
                <a
                  href="/api/export/csv"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Download CSV for Payroll
                </a>
              )}
            </div>
            <HrRecordsList
              requests={allRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="all"
              emptyMessage="No records to display."
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
