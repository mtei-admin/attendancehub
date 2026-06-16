import Link from "next/link";

import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { AdminTableActions, PasswordBadge } from "./admin-table-actions";
import { PortalUserModal } from "./portal-user-modal";

type PortalUserPanelProps = {
  users: User[];
  departments: Department[];
  companies: string[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  role: "Manager" | "HR";
  editId?: number;
  showAdd?: boolean;
  basePath: "/hr" | "/admin";
  tab: string;
};

export function PortalUserPanel({
  users,
  departments,
  companies,
  saveAction,
  deleteAction,
  role,
  editId,
  showAdd = false,
  basePath,
  tab,
}: PortalUserPanelProps) {
  const editing = editId ? users.find((row) => row.id === editId) : null;
  const showModal = showAdd || Boolean(editing);
  const panelHref = `${basePath}?tab=${tab}`;
  const isAdmin = basePath === "/admin";
  const panelTitle = role === "Manager" ? "Manager accounts" : "HR accounts";
  const addLabel = role === "Manager" ? "+ Add manager" : "+ Add HR account";
  const detailHeader = role === "Manager" ? "Company · Department" : "HR scope";

  const adminHeaders =
    role === "Manager"
      ? ["Name", "Username", "Password", "Company · Department", "Actions"]
      : ["Name", "Username", "Password", "HR scope", "Actions"];

  const hrHeaders = ["Name", "Username", detailHeader, "Status", "Actions"];
  const headers = isAdmin ? adminHeaders : hrHeaders;

  return (
    <>
      <PortalUserModal
        open={showModal}
        cancelHref={panelHref}
        saveAction={saveAction}
        role={role}
        departments={departments}
        companies={companies}
        editing={editing}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {panelTitle} ({users.length})
          </h2>
          <Link
            href={`${panelHref}&add=1`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            {addLabel}
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {headers.map((header) => (
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
              {users.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-4 py-8 text-center text-slate-500">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{user.fullName}</td>
                    <td className="px-4 py-3 text-slate-700">{user.username}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <PasswordBadge value={user.passwordHint} />
                      </td>
                    )}
                    <td className="px-4 py-3 text-slate-700">
                      {role === "Manager"
                        ? user.company && user.department
                          ? `${user.company} · ${user.department}`
                          : user.department || "—"
                        : user.hrScope || "—"}
                    </td>
                    {!isAdmin && (
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
                    )}
                    <td className="px-4 py-3">
                      {isAdmin && deleteAction ? (
                        <AdminTableActions
                          editHref={`${panelHref}&edit=${user.id}`}
                          itemId={user.id}
                          itemName={user.fullName}
                          deleteAction={deleteAction}
                          confirmMessage={`Remove {name} from the list?`}
                          tab={tab}
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
