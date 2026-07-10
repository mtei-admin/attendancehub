import Link from "next/link";

import type { Department, User } from "@/lib/schema";

import { AdminTableActions, PasswordBadge } from "./admin-table-actions";
import { PortalUserModal } from "./portal-user-modal";

type HrAccountRole = "HR" | "Payroll Officer";

type HrAccountsPanelProps = {
  hrUsers: User[];
  payrollOfficers: User[];
  departments: Department[];
  companies: string[];
  saveHrAction: (formData: FormData) => Promise<void>;
  savePayrollAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  addRole?: HrAccountRole;
  editId?: number;
};

function accountDetail(user: User): string {
  if (user.role === "Payroll Officer") {
    return "Confi processing · R&F checked";
  }
  return user.hrScope || "—";
}

function accountTypeLabel(role: string): string {
  return role === "Payroll Officer" ? "Payroll officer" : "HR";
}

export function HrAccountsPanel({
  hrUsers,
  payrollOfficers,
  departments,
  companies,
  saveHrAction,
  savePayrollAction,
  deleteAction,
  addRole,
  editId,
}: HrAccountsPanelProps) {
  const panelHref = "/admin?tab=hr";
  const allUsers = [...hrUsers, ...payrollOfficers].sort((a, b) =>
    a.fullName.localeCompare(b.fullName),
  );
  const editing = editId ? allUsers.find((row) => row.id === editId) : null;
  const modalRole: HrAccountRole | null = editing
    ? editing.role === "Payroll Officer"
      ? "Payroll Officer"
      : "HR"
    : addRole ?? null;
  const showModal = Boolean(modalRole);

  return (
    <>
      {modalRole === "HR" && (
        <PortalUserModal
          open={showModal}
          cancelHref={panelHref}
          saveAction={saveHrAction}
          role="HR"
          departments={departments}
          companies={companies}
          editing={editing?.role === "HR" ? editing : null}
        />
      )}
      {modalRole === "Payroll Officer" && (
        <PortalUserModal
          open={showModal}
          cancelHref={panelHref}
          saveAction={savePayrollAction}
          role="Payroll Officer"
          departments={departments}
          companies={companies}
          editing={editing?.role === "Payroll Officer" ? editing : null}
        />
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            HR & payroll accounts ({allUsers.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${panelHref}&add=hr`}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              + Add HR account
            </Link>
            <Link
              href={`${panelHref}&add=payroll`}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-600 transition hover:bg-brand-50"
            >
              + Add payroll officer
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Name", "Username", "Password", "Account type", "Access", "Actions"].map(
                  (header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                allUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-slate-700">{user.username}</td>
                    <td className="px-4 py-3">
                      <PasswordBadge value={user.passwordHint} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{accountTypeLabel(user.role)}</td>
                    <td className="px-4 py-3 text-slate-700">{accountDetail(user)}</td>
                    <td className="px-4 py-3">
                      <AdminTableActions
                        editHref={`${panelHref}&edit=${user.id}`}
                        itemId={user.id}
                        itemName={user.fullName}
                        deleteAction={deleteAction}
                        confirmMessage="Remove {name} from the list?"
                        tab="hr"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
