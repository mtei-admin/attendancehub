import Link from "next/link";

import type { AttendanceRequest } from "@/lib/schema";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";

import {
  AdminSlipsFilterBar,
  type AdminSlipsFilters,
} from "./admin-slips-filter-bar";
import { AdminSlipEditModal } from "./admin-slip-edit-modal";
import {
  formatManagerSubmittedDate,
  formatManagerTime,
} from "./manager-request-utils";

type AdminSlipsPanelProps = {
  requests: AttendanceRequest[];
  totalCount: number;
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  filters: AdminSlipsFilters;
  editRequest?: AttendanceRequest | null;
};

function workflowLabel(request: AttendanceRequest): string {
  if (request.archived) return "Checked";
  if (request.status === "Approved") return "HR pending";
  if (request.status === "Rejected") return "Rejected";
  if (request.verifiedOn) return "Manager pending";
  return "Verification pending";
}

function workflowClass(request: AttendanceRequest): string {
  if (request.archived) return "bg-emerald-100 text-emerald-700";
  if (request.status === "Approved") return "bg-orange-100 text-orange-700";
  if (request.status === "Rejected") return "bg-red-100 text-red-700";
  if (request.verifiedOn) return "bg-amber-100 text-amber-700";
  return "bg-cyan-100 text-cyan-700";
}

function buildSlipsHref(filters: AdminSlipsFilters, editRefId?: string): string {
  const search = new URLSearchParams({ tab: "slips" });
  if (filters.company) search.set("company", filters.company);
  if (filters.department) search.set("department", filters.department);
  if (filters.employee) search.set("employee", filters.employee);
  if (filters.from) search.set("from", filters.from);
  if (filters.to) search.set("to", filters.to);
  if (filters.requestType) search.set("request_type", filters.requestType);
  if (editRefId) search.set("edit_ref", editRefId);
  return `/admin?${search.toString()}`;
}

export function AdminSlipsPanel({
  requests,
  totalCount,
  companies,
  employeesByCompanyDepartment,
  filters,
  editRequest = null,
}: AdminSlipsPanelProps) {
  const panelHref = buildSlipsHref(filters);
  const showModal = Boolean(editRequest);

  return (
    <>
      <AdminSlipEditModal
        open={showModal}
        cancelHref={panelHref}
        request={editRequest}
        companies={companies}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Attendance slips</h2>
          <p className="mt-1 text-sm text-slate-500">
            View and correct any encoded slip regardless of workflow stage.
          </p>
        </div>

        <AdminSlipsFilterBar
          key={`${filters.company}|${filters.department}|${filters.employee}|${filters.from}|${filters.to}|${filters.requestType}`}
          companies={companies}
          employeesByCompanyDepartment={employeesByCompanyDepartment}
          filters={filters}
          resultCount={requests.length}
          totalCount={totalCount}
        />

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "Ref",
                  "Employee",
                  "Type",
                  "Incident date",
                  "Workflow",
                  "Submitted",
                  "Actions",
                ].map((header) => (
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
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    {totalCount === 0
                      ? "No slips encoded yet."
                      : "No slips match the selected filters."}
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-4 font-semibold text-slate-900">{request.refId}</td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-slate-900">{request.employeeName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {request.company ? `${request.company} · ` : ""}
                        {request.department || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {request.requestType}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{request.dateOfIncident}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${workflowClass(request)}`}
                      >
                        {workflowLabel(request)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatManagerSubmittedDate(request.submittedAt)}
                      {(request.timeIn || request.timeOut) && (
                        <p className="mt-1 text-xs text-slate-500">
                          {formatManagerTime(request.timeIn)} – {formatManagerTime(request.timeOut)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={buildSlipsHref(filters, request.refId)}
                        className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
                      >
                        Edit
                      </Link>
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
