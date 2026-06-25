import {
  saveAdminEmployeeAction,
  deleteAdminEmployeeAction,
  deleteAdminCompanyAction,
  deleteAdminDepartmentAction,
  deleteAdminUserAction,
  saveAdminHrAction,
  saveAdminManagerAction,
  saveCompanyAction,
  saveDepartmentAction,
} from "@/actions/admin";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { CompanyPanel } from "@/components/company-panel";
import { CredentialsPanel } from "@/components/credentials-panel";
import { DepartmentPanel } from "@/components/department-panel";
import { FlashMessage } from "@/components/flash-message";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { RecordRequestLogsPanel } from "@/components/record-request-logs-panel";
import { buildAdminDashboardStats } from "@/lib/admin-stats";
import { listCompanies } from "@/lib/companies";
import { listDepartments } from "@/lib/departments";
import { getAllRequests } from "@/lib/requests";
import { listRecordRequestLogs } from "@/lib/record-requests";
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
    tab === "companies" ||
    tab === "departments" ||
    tab === "credentials" ||
    tab === "record-logs"
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

  const [companies, departments, employees, managers, hrUsers, allUsers, allRequests, recordRequestLogs] =
    await Promise.all([
      listCompanies(),
      listDepartments(),
      listEmployees(),
      listUsersByRole("Manager", true),
      listUsersByRole("HR", true),
      listAllUsers(true),
      getAllRequests(),
      listRecordRequestLogs(),
    ]);

  const activeEmployees = employees.filter((employee) => employee.isActive);
  const activeCompanies = companies.filter((company) => company.isActive);
  const activeDepartments = departments.filter((department) => department.isActive);
  const companyNames = activeCompanies.map((company) => company.name);
  const dashboardStats = buildAdminDashboardStats(allRequests, activeEmployees.length);

  return (
    <>
      <AdminTabs
        activeTab={activeTab}
        employeeCount={activeEmployees.length}
        managerCount={managers.length}
        hrCount={hrUsers.length}
        companyCount={activeCompanies.length}
        departmentCount={activeDepartments.length}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "dashboard" && <AdminDashboard stats={dashboardStats} />}

        {activeTab === "companies" && (
          <CompanyPanel
            companies={companies}
            saveAction={saveCompanyAction}
            deleteAction={deleteAdminCompanyAction}
            editId={editId}
            showAdd={showAdd}
            basePath="/admin"
            tab="companies"
          />
        )}

        {activeTab === "departments" && (
          <DepartmentPanel
            departments={departments}
            companies={companyNames}
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
            companies={companyNames}
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
            companies={companyNames}
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
            companies={companyNames}
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
            companies={companyNames}
            editId={editId}
            showAdd={showAdd}
            deleteAction={deleteAdminUserAction}
          />
        )}

        {activeTab === "record-logs" && <RecordRequestLogsPanel logs={recordRequestLogs} />}
      </div>
    </>
  );
}

