import { saveCredentialsAction } from "@/actions/admin";
import { HR_SCOPES, ROLES } from "@/lib/constants";
import type { Department } from "@/lib/schema";
import type { User } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";

type CredentialsPanelProps = {
  users: User[];
  departments: Department[];
  editId?: number;
};

export function CredentialsPanel({ users, departments, editId }: CredentialsPanelProps) {
  const editing = editId ? users.find((row) => row.id === editId) : null;
  const activeDepartments = departments.filter((row) => row.isActive);

  return (
    <div className="space-y-6">
      {editing ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Edit credentials — {editing.fullName}
          </h3>
          <form action={saveCredentialsAction} className="mt-4 grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={editing.id} />
            <FormField label="Full name">
              <input
                name="full_name"
                required
                defaultValue={editing.fullName}
                className={inputClassName}
              />
            </FormField>
            <FormField label="Username">
              <input
                name="username"
                required
                defaultValue={editing.username}
                className={inputClassName}
                autoComplete="off"
              />
            </FormField>
            <FormField label="New password (optional)">
              <input
                type="password"
                name="password"
                className={inputClassName}
                autoComplete="new-password"
                placeholder="Leave blank to keep current"
              />
            </FormField>
            <FormField label="Role">
              <select name="role" required defaultValue={editing.role} className={inputClassName}>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Department">
              <select name="department" defaultValue={editing.department ?? ""} className={inputClassName}>
                <option value="">— None —</option>
                {activeDepartments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="HR scope">
              <select name="hr_scope" defaultValue={editing.hrScope ?? ""} className={inputClassName}>
                <option value="">— None —</option>
                {HR_SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {scope}
                  </option>
                ))}
              </select>
            </FormField>
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
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Save credentials
              </button>
              <a
                href="/admin?tab=credentials"
                className="ml-3 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Cancel
              </a>
            </div>
          </form>
        </section>
      ) : (
        <p className="text-sm text-slate-500">
          Select an account below to update username, password, role, and access settings.
        </p>
      )}

      <section className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Name", "Username", "Role", "Department", "HR Scope", "Status", "Actions"].map(
                (header) => (
                  <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.username}</td>
                <td className="px-4 py-3 text-slate-600">{user.role}</td>
                <td className="px-4 py-3 text-slate-600">{user.department ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{user.hrScope ?? "—"}</td>
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
                    href={`/admin?tab=credentials&edit=${user.id}`}
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
