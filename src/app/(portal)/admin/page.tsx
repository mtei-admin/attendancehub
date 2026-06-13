import {
  saveAdminEmployeeAction,
  saveAdminHrAction,
  saveAdminManagerAction,
  saveDepartmentAction,
} from "@/actions/admin";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { CredentialsPanel } from "@/components/credentials-panel";
import { DepartmentPanel } from "@/components/department-panel";
import { FlashMessage } from "@/components/flash-message";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { buildAdminDashboardStats } from "@/lib/admin-stats";
import { listDepartments } from "@/lib/departments";
import { getAllRequests } from "@/lib/requests";
import { listEmployees } from "@/lib/roster";
import { listAllUsers, listUsersByRole } from "@/lib/users";

type AdminPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
};

function resolveTab(tab?: string): AdminTab {
  if (
    tab === "employees" ||
    tab === "managers" ||
    tab === "hr" ||
    tab === "departments" ||
    tab === "credentials"
  ) {
    return tab;
  }
  if (tab === "overview") {
    return "dashboard";
  }
  return "dashboard";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const editId = params.edit ? Number(params.edit) : undefined;

  const [departments, employees, managers, hrUsers, allUsers, allRequests] =
    await Promise.all([
      listDepartments(),
      listEmployees(),
      listUsersByRole("Manager"),
      listUsersByRole("HR"),
      listAllUsers(),
      getAllRequests(),
    ]);

  const activeEmployees = employees.filter((employee) => employee.isActive);
  const activeDepartments = departments.filter((department) => department.isActive);
  const dashboardStats = buildAdminDashboardStats(allRequests, activeEmployees.length);

  return (
    <>
      <AdminTabs
        activeTab={activeTab}
        employeeCount={activeEmployees.length}
        managerCount={managers.length}
        hrCount={hrUsers.length}
        departmentCount={activeDepartments.length}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "dashboard" && <AdminDashboard stats={dashboardStats} />}

        {activeTab === "departments" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Departments</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add or update departments used across the system.
              </p>
            </div>
            <DepartmentPanel
              departments={departments}
              saveAction={saveDepartmentAction}
              editId={editId}
              tab="departments"
            />
          </section>
        )}

        {activeTab === "employees" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Employee roster</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage the employee roster shown on the submission form.
              </p>
            </div>
            <RosterPanel
              employees={employees}
              departments={departments}
              saveAction={saveAdminEmployeeAction}
              editId={editId}
              basePath="/admin"
              tab="employees"
            />
          </section>
        )}

        {activeTab === "managers" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Managers</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create and maintain manager portal accounts.
              </p>
            </div>
            <PortalUserPanel
              users={managers}
              departments={departments}
              saveAction={saveAdminManagerAction}
              role="Manager"
              editId={editId}
              basePath="/admin"
              tab="managers"
            />
          </section>
        )}

        {activeTab === "hr" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">HR accounts</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create and maintain HR portal accounts and scope settings.
              </p>
            </div>
            <PortalUserPanel
              users={hrUsers}
              departments={departments}
              saveAction={saveAdminHrAction}
              role="HR"
              editId={editId}
              basePath="/admin"
              tab="hr"
            />
          </section>
        )}

        {activeTab === "credentials" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Credentials</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update usernames, passwords, roles, and account status for all users.
              </p>
            </div>
            <CredentialsPanel users={allUsers} departments={departments} editId={editId} />
          </section>
        )}
      </div>
    </>
  );
}
