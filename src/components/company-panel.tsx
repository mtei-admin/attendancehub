import Link from "next/link";

import type { Company } from "@/lib/schema";

import { AdminTableActions } from "./admin-table-actions";
import { CompanyModal } from "./company-modal";

type CompanyPanelProps = {
  companies: Company[];
  saveAction: (formData: FormData) => Promise<void>;
  deleteAction?: (formData: FormData) => Promise<void>;
  editId?: number;
  showAdd?: boolean;
  basePath: "/hr" | "/admin";
  tab: string;
};

export function CompanyPanel({
  companies,
  saveAction,
  deleteAction,
  editId,
  showAdd = false,
  basePath,
  tab,
}: CompanyPanelProps) {
  const editing = editId ? companies.find((row) => row.id === editId) : null;
  const showModal = showAdd || Boolean(editing);
  const panelHref = `${basePath}?tab=${tab}`;
  const activeCompanies = companies.filter((company) => company.isActive);

  return (
    <>
      <CompanyModal
        open={showModal}
        cancelHref={panelHref}
        saveAction={saveAction}
        editing={editing}
      />

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Companies ({activeCompanies.length})
          </h2>
          <Link
            href={`${panelHref}&add=1`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Add company
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Company", "Actions"].map((header) => (
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
              {activeCompanies.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    No companies yet.
                  </td>
                </tr>
              ) : (
                activeCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-900">{company.name}</td>
                    <td className="px-4 py-3">
                      {deleteAction ? (
                        <AdminTableActions
                          editHref={`${panelHref}&edit=${company.id}`}
                          itemId={company.id}
                          itemName={company.name}
                          deleteAction={deleteAction}
                          confirmMessage={`Remove company {name}?`}
                          tab={tab}
                        />
                      ) : (
                        <Link
                          href={`${panelHref}&edit=${company.id}`}
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
