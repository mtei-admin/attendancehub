import type { Department } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";

type DepartmentPanelProps = {
  departments: Department[];
  saveAction: (formData: FormData) => Promise<void>;
  editId?: number;
  tab: string;
};

export function DepartmentPanel({
  departments,
  saveAction,
  editId,
  tab,
}: DepartmentPanelProps) {
  const editing = editId ? departments.find((row) => row.id === editId) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          {editing ? "Edit department" : "Add department"}
        </h3>
        <form action={saveAction} className="mt-4 grid gap-4 md:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <FormField label="Department name">
            <input
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              className={inputClassName}
              placeholder="e.g. Operations"
            />
          </FormField>
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
              {editing ? "Save changes" : "Add department"}
            </button>
            {editing && (
              <a
                href={`/admin?tab=${tab}`}
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
              {["Department", "Status", "Actions"].map((header) => (
                <th key={header} className="px-4 py-3 text-left font-semibold text-slate-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((department) => (
              <tr key={department.id}>
                <td className="px-4 py-3 font-medium text-slate-900">{department.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      department.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {department.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a
                    href={`/admin?tab=${tab}&edit=${department.id}`}
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
