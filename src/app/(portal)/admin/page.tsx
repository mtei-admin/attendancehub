import {
  saveAdminEmployeeAction,
  deleteAdminEmployeeAction,
  deleteAdminCompanyAction,
  deleteAdminDepartmentAction,
  deleteAdminUserAction,
  saveAdminHrAction,
  saveAdminManagerAction,
  saveAdminPayrollOfficerAction,
  saveAdminVerifierAction,
  saveCompanyAction,
  saveDepartmentAction,
} from "@/actions/admin";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminSlipsPanel } from "@/components/admin-slips-panel";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { CompanyPanel } from "@/components/company-panel";
import { CredentialsPanel } from "@/components/credentials-panel";
import { DepartmentPanel } from "@/components/department-panel";
import { FlashMessage } from "@/components/flash-message";
import { HrAccountsPanel } from "@/components/hr-accounts-panel";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { RecordRequestLogsPanel } from "@/components/record-request-logs-panel";
import {
  buildAdminDashboardStats,
  filterRequestsForDashboardView,
  groupActiveEmployeesByPlacement,
  groupRequestsByPlacement,
  type AdminDashboardView,
} from "@/lib/admin-stats";
import { listCompanies } from "@/lib/companies";
import { listDepartments } from "@/lib/departments";
import { getAllRequests } from "@/lib/requests";
import { listRecordRequestLogs } from "@/lib/record-requests";
import { listEmployees, buildEmployeesByCompanyDepartment } from "@/lib/roster";
import { listAllUsers, listUsersByRole } from "@/lib/users";

type AdminPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    edit_ref?: string;
    add?: string;
    success?: string;
    error?: string;
    view?: string;
  }>;
};

const DASHBOARD_VIEWS = [
  "employees",
  "pending-verification",
  "pending-manager",
  "pending-hr",
  "all-requests",
] as const;

function resolveDashboardView(view?: string): AdminDashboardView | undefined {
  if (view && (DASHBOARD_VIEWS as readonly string[]).includes(view)) {
    return view as AdminDashboardView;
  }
  return undefined;
}

function resolveTab(tab?: string): AdminTab {
  if (tab === "payroll") {
    return "hr";
  }

  if (
    tab === "employees" ||
    tab === "managers" ||
    tab === "verifiers" ||
    tab === "hr" ||
    tab === "slips" ||
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
  const editRefId = params.edit_ref?.trim() || undefined;
  const showAdd = params.add === "1";

  const [companies, departments, employees, managers, verifiers, hrUsers, payrollOfficers, allUsers, allRequests, recordRequestLogs] =
    await Promise.all([
      listCompanies(),
      listDepartments(),
      listEmployees(),
      listUsersByRole("Manager", true),
      listUsersByRole("Verifier", true),
      listUsersByRole("HR", true),
      listUsersByRole("Payroll Officer", true),
      listAllUsers(),
      getAllRequests(),
      listRecordRequestLogs(),
    ]);

  const activeEmployees = employees.filter((employee) => employee.isActive);
  const activeCompanies = companies.filter((company) => company.isActive);
  const activeDepartments = departments.filter((department) => department.isActive);
  const companyNames = activeCompanies.map((company) => company.name);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(employees);
  const dashboardStats = buildAdminDashboardStats(allRequests, activeEmployees.length);
  const dashboardView = resolveDashboardView(params.view);
  const filteredRequests = dashboardView
    ? filterRequestsForDashboardView(allRequests, dashboardView)
    : [];
  const groupedSlips = dashboardView && dashboardView !== "employees"
    ? groupRequestsByPlacement(filteredRequests)
    : [];
  const groupedEmployees =
    dashboardView === "employees" ? groupActiveEmployeesByPlacement(employees) : [];
  const viewCount =
    dashboardView === "employees" ? activeEmployees.length : filteredRequests.length;

  return (
    <>
      <AdminTabs
        activeTab={activeTab}
        employeeCount={activeEmployees.length}
        managerCount={managers.length}
        verifierCount={verifiers.length}
        hrAccountCount={hrUsers.length + payrollOfficers.length}
        slipCount={allRequests.length}
        companyCount={activeCompanies.length}
        departmentCount={activeDepartments.length}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "dashboard" && (
          <AdminDashboard
            stats={dashboardStats}
            activeView={dashboardView}
            groupedSlips={groupedSlips}
            groupedEmployees={groupedEmployees}
            viewCount={viewCount}
          />
        )}

        {activeTab === "slips" && (
          <AdminSlipsPanel
            requests={allRequests}
            companies={companyNames}
            employeesByCompanyDepartment={employeesByCompanyDepartment}
            editRefId={editRefId}
          />
        )}

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

        {activeTab === "verifiers" && (
          <PortalUserPanel
            users={verifiers}
            departments={departments}
            companies={companyNames}
            saveAction={saveAdminVerifierAction}
            deleteAction={deleteAdminUserAction}
            role="Verifier"
            editId={editId}
            showAdd={showAdd}
            basePath="/admin"
            tab="verifiers"
          />
        )}

        {activeTab === "hr" && (
          <HrAccountsPanel
            hrUsers={hrUsers}
            payrollOfficers={payrollOfficers}
            departments={departments}
            companies={companyNames}
            saveHrAction={saveAdminHrAction}
            savePayrollAction={saveAdminPayrollOfficerAction}
            deleteAction={deleteAdminUserAction}
            addRole={
              params.add === "hr"
                ? "HR"
                : params.add === "payroll"
                  ? "Payroll Officer"
                  : undefined
            }
            editId={editId}
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

