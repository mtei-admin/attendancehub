import Link from "next/link";

import {
  saveAdminEmployeeAction,
  saveAdminHrAction,
  saveAdminManagerAction,
  saveDepartmentAction,
} from "@/actions/admin";
import { AdminTabs, type AdminTab } from "@/components/admin-tabs";
import { CredentialsPanel } from "@/components/credentials-panel";
import { DepartmentPanel } from "@/components/department-panel";
import { FlashMessage } from "@/components/flash-message";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { ROLE_ROUTES } from "@/lib/constants";
import { listDepartments } from "@/lib/departments";
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
    tab === "departments" ||
    tab === "employees" ||
    tab === "managers" ||
    tab === "hr" ||
    tab === "credentials"
  ) {
    return tab;
  }
  return "overview";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const editId = params.edit ? Number(params.edit) : undefined;

  const [departments, employees, managers, hrUsers, allUsers] = await Promise.all([
    listDepartments(),
    listEmployees(),
    listUsersByRole("Manager"),
    listUsersByRole("HR"),
    listAllUsers(),
  ]);

  const portals = [
    { label: "Employee portal", href: ROLE_ROUTES.Employee },
    { label: "Manager portal", href: ROLE_ROUTES.Manager },
    { label: "HR portal", href: ROLE_ROUTES.HR },
  ];

  return (
    <>
      <AdminTabs activeTab={activeTab} />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "overview" && (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">System Overview</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage accounts, roster, departments, and access all portal views.
              </p>
            </div>

            <section className="grid gap-4 sm:grid-cols-3">
              {portals.map((portal) => (
                <Link
                  key={portal.href}
                  href={portal.href}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow-md"
                >
                  <p className="font-semibold text-slate-900">{portal.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Open portal view →</p>
                </Link>
              ))}
            </section>

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Departments", value: departments.length, tab: "departments" },
                { label: "Employees", value: employees.length, tab: "employees" },
                { label: "Managers", value: managers.length, tab: "managers" },
                { label: "HR accounts", value: hrUsers.length, tab: "hr" },
              ].map((item) => (
                <Link
                  key={item.tab}
                  href={`/admin?tab=${item.tab}`}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300"
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
                </Link>
              ))}
            </section>
          </>
        )}

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
              <h2 className="text-2xl font-semibold text-slate-900">Employees</h2>
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
              <h2 className="text-2xl font-semibold text-slate-900">HR Accounts</h2>
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
