import Link from "next/link";

import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { AdminTableActions, PasswordBadge } from "./admin-table-actions";
import { CredentialsModal } from "./credentials-modal";

type CredentialsPanelProps = {
  users: User[];
  departments: Department[];
  companies: string[];
  editId?: number;
  showAdd?: boolean;
  deleteAction?: (formData: FormData) => Promise<void>;
};

export function CredentialsPanel({
  users,
  departments,
  companies,
  editId,
  showAdd = false,
  deleteAction,
}: CredentialsPanelProps) {
  const editing = editId ? users.find((row) => row.id === editId) : null;
  const panelHref = "/admin?tab=credentials";
  const showModal = showAdd || Boolean(editing);
  const sortedUsers = [...users].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.fullName.localeCompare(b.fullName);
  });
  const activeCount = users.filter((user) => user.isActive).length;
  const inactiveCount = users.length - activeCount;

  return (
    <>
      <CredentialsModal
        open={showModal}
        cancelHref={panelHref}
        departments={departments}
        companies={companies}
        editing={editing}
        isAdding={showAdd && !editing}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Credentials ({users.length})
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {activeCount} active
              {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}
            </p>
          </div>
          <Link
            href={`${panelHref}&add=1`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Add user
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Name", "Username", "Password", "Role", "Status", "Actions"].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No accounts found.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/60 ${user.isActive ? "" : "bg-slate-50/40"}`}
                  >
                    <td
                      className={`px-4 py-3 font-semibold ${
                        user.isActive ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {user.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.username}</td>
                    <td className="px-4 py-3">
                      <PasswordBadge value={user.passwordHint} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">{user.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {deleteAction ? (
                        <AdminTableActions
                          editHref={`${panelHref}&edit=${user.id}`}
                          itemId={user.id}
                          itemName={user.fullName}
                          deleteAction={deleteAction}
                          confirmMessage={`Remove {name} from the list?`}
                          tab="credentials"
                        />
                      ) : (
                        <Link
                          href={`${panelHref}&edit=${user.id}`}
                          className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                        >
                          Edit
                        </Link>
                      )}
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
