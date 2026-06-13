import { HR_SCOPES } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";

type PortalUserPanelProps = {
  users: User[];
  departments: Department[];
  saveAction: (formData: FormData) => Promise<void>;
  role: "Manager" | "HR";
  editId?: number;
  basePath: "/hr" | "/admin";
  tab: string;
};

export function PortalUserPanel({
  users,
  departments,
  saveAction,
  role,
  editId,
  basePath,
  tab,
}: PortalUserPanelProps) {
  const editing = editId ? users.find((row) => row.id === editId) : null;
  const activeDepartments = departments.filter((row) => row.isActive);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          {editing ? `Edit ${role.toLowerCase()}` : `Add ${role.toLowerCase()}`}
        </h3>
        <form action={saveAction} className="mt-4 grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <FormField label="Full name">
            <input
              name="full_name"
              required
              defaultValue={editing?.fullName ?? ""}
              className={inputClassName}
            />
          </FormField>
          <FormField label="Username">
            <input
              name="username"
              required
              defaultValue={editing?.username ?? ""}
              className={inputClassName}
              autoComplete="off"
            />
          </FormField>
          <FormField label={editing ? "New password (optional)" : "Password"}>
            <input
              type="password"
              name="password"
              required={!editing}
              className={inputClassName}
              autoComplete="new-password"
              placeholder={editing ? "Leave blank to keep current" : ""}
            />
          </FormField>
          {role === "Manager" && (
            <FormField label="Department">
              <select
                name="department"
                required
                defaultValue={editing?.department ?? ""}
                className={inputClassName}
              >
                <option value="">— Select department —</option>
                {activeDepartments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          {role === "HR" && (
            <FormField label="HR scope">
              <select
                name="hr_scope"
                defaultValue={editing?.hrScope ?? ""}
                className={inputClassName}
              >
                <option value="">— No scope —</option>
                {HR_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </FormField>
          )}
          {editing && (
            <FormField label="Status">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing.isActive}
                  className="rounded border-slate-300"
                />
                Active
              </label>
            </FormField>
          )}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {editing ? "Save changes" : `Add ${role.toLowerCase()}`}
            </button>
            {editing && (
              <a
                href={`${basePath}?tab=${tab}`}
                className="ml-3 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </a>
            )}
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                "Name",
                "Username",
                role === "Manager" ? "Department" : "HR Scope",
                "Status",
                "Actions",
              ].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.username}</td>
                <td className="px-4 py-3 text-slate-600">
                  {role === "Manager" ? user.department || "—" : user.hrScope || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      user.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`${basePath}?tab=${tab}&edit=${user.id}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Edit
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
