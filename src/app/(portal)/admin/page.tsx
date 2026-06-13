import {
  saveAdminEmployeeAction,
  deleteAdminEmployeeAction,
  deleteAdminDepartmentAction,
  deleteAdminUserAction,
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
    add?: string;
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
  const showAdd = params.add === "1";

  const [departments, employees, managers, hrUsers, allUsers, allRequests] =
    await Promise.all([
      listDepartments(),
      listEmployees(),
      listUsersByRole("Manager", true),
      listUsersByRole("HR", true),
      listAllUsers(true),
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
          <DepartmentPanel
            departments={departments}
            saveAction={saveDepartmentAction}
            deleteAction={deleteAdminDepartmentAction}
            editId={editId}
            showAdd={showAdd}
            tab="departments"
          />
        )}

        {activeTab === "employees" && (
          <RosterPanel
            employees={employees}
            departments={departments}
            saveAction={saveAdminEmployeeAction}
            deleteAction={deleteAdminEmployeeAction}
            editId={editId}
            showAdd={showAdd}
            basePath="/admin"
            tab="employees"
          />
        )}

        {activeTab === "managers" && (
          <PortalUserPanel
            users={managers}
            departments={departments}
            saveAction={saveAdminManagerAction}
            deleteAction={deleteAdminUserAction}
            role="Manager"
            editId={editId}
            showAdd={showAdd}
            basePath="/admin"
            tab="managers"
          />
        )}

        {activeTab === "hr" && (
          <PortalUserPanel
            users={hrUsers}
            departments={departments}
            saveAction={saveAdminHrAction}
            deleteAction={deleteAdminUserAction}
            role="HR"
            editId={editId}
            showAdd={showAdd}
            basePath="/admin"
            tab="hr"
          />
        )}

        {activeTab === "credentials" && (
          <CredentialsPanel
            users={allUsers}
            departments={departments}
            editId={editId}
            showAdd={showAdd}
            deleteAction={deleteAdminUserAction}
          />
        )}
      </div>
    </>
  );
}

