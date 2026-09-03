"use client";

import type { AttendanceRequest } from "@/lib/schema";
import type { RecordRequestFilters } from "@/lib/record-requests";
import { buildRecordsViewSearchParams } from "@/lib/records-view-session";
import { canEmployeeEditRecord } from "@/lib/record-requests";
import { preApprovedOtStageLabel } from "@/lib/pre-approved-ot";

import { EmployeeRecordEditModal } from "./employee-record-edit-modal";

type EmployeeRecordsListProps = {
  records: AttendanceRequest[];
  filters: RecordRequestFilters;
  viewedAt: number;
  editRefId?: string;
  exportUrl: string;
  employeeType?: string;
  availableOtOffsetBalance?: number | null;
  otSubmittedThisCutoff?: number | null;
  otHrCheckedThisCutoff?: number | null;
  otClaimedCutoffLabel?: string | null;
};

function formatSubmittedAt(value: Date | null): string {
  if (!value) return "—";
  return value.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function verificationLabel(request: AttendanceRequest): string {
  if (request.isPreApprovedOt && request.status === "Pending") {
    const stage = preApprovedOtStageLabel(request);
    if (stage) return stage;
  }
  if (request.status !== "Pending") return "—";
  return request.verifiedOn ? `Verified (${request.verifiedBy ?? "—"})` : "Unverified";
}

function statusLabel(request: AttendanceRequest): string {
  if (request.isPreApprovedOt && request.status === "Pending") {
    return "Pending (pre-approved OT)";
  }
  return request.status;
}

export function EmployeeRecordsList({
  records,
  filters,
  viewedAt,
  editRefId,
  exportUrl,
  employeeType,
  availableOtOffsetBalance,
  otSubmittedThisCutoff,
  otHrCheckedThisCutoff,
  otClaimedCutoffLabel,
}: EmployeeRecordsListProps) {
  const editingRequest = editRefId
    ? records.find((row) => row.refId === editRefId && canEmployeeEditRecord(row))
    : undefined;

  const isConfi = employeeType === "Confi";
  const isRankAndFile = employeeType === "Rank & File";
  const showRfOtSummary =
    isRankAndFile &&
    otSubmittedThisCutoff !== null &&
    otSubmittedThisCutoff !== undefined &&
    otHrCheckedThisCutoff !== null &&
    otHrCheckedThisCutoff !== undefined;

  return (
    <section className="space-y-4 border-t border-slate-100 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Your records</h3>
          <p className="text-sm text-slate-500">
            {filters.employeeName} · {filters.submittedFrom} to {filters.submittedTo} ·{" "}
            {records.length} record{records.length === 1 ? "" : "s"}
          </p>
        </div>
        <a
          href={exportUrl}
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
        >
          Download CSV
        </a>
      </div>

      {isConfi && availableOtOffsetBalance !== null && availableOtOffsetBalance !== undefined && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Available OT Offset Balance
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {availableOtOffsetBalance.toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Lifetime balance from HR-checked OT credits minus HR-checked OT Offset usage.
          </p>
        </div>
      )}

      {showRfOtSummary && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            OT this cutoff
          </p>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-slate-500">Submitted</p>
              <p className="mt-0.5 text-2xl font-semibold text-slate-900">
                {otSubmittedThisCutoff.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">HR checked</p>
              <p className="mt-0.5 text-2xl font-semibold text-slate-900">
                {otHrCheckedThisCutoff.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Overtime and Holiday/Rest Day Work for the current cutoff
            {otClaimedCutoffLabel ? ` (${otClaimedCutoffLabel})` : ""}. Submitted excludes
            rejected slips.
          </p>
        </div>
      )}

      <div className="max-h-[18rem] overflow-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
            <tr>
              {[
                "Ref",
                "Type",
                "Submitted",
                "Incident",
                "Status",
                "Verification",
                "OT req.",
                "OT appr.",
                "HR checked",
                "Action",
              ].map((header) => (
                <th
                  key={header}
                  className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                  No records match your filters.
                </td>
              </tr>
            ) : (
              records.map((request) => {
                const editable = canEmployeeEditRecord(request);
                const isEditing = editRefId === request.refId && editable;

                return (
                  <tr
                    key={request.id}
                    className={`hover:bg-slate-50/60 ${isEditing ? "bg-brand-50/40" : ""}`}
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">{request.refId}</td>
                    <td className="px-3 py-3 text-slate-700">{request.requestType}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatSubmittedAt(request.submittedAt)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{request.dateOfIncident}</td>
                    <td className="px-3 py-3 text-slate-700">{statusLabel(request)}</td>
                    <td className="px-3 py-3 text-slate-700">{verificationLabel(request)}</td>
                    <td className="px-3 py-3 text-slate-700">
                      {request.requestedOtHrs ?? request.otHrs ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {request.status === "Approved" ? request.otHrs ?? "—" : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {request.archived ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-3">
                      {editable ? (
                        <a
                          href={`/employee?${buildEditHref(filters, viewedAt, request.refId)}`}
                          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
                        >
                          Edit
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <EmployeeRecordEditModal
        open={Boolean(editingRequest)}
        request={editingRequest ?? null}
        filters={filters}
        cancelHref={`/employee?${buildViewHref(filters, viewedAt)}`}
        employeeType={employeeType}
      />
    </section>
  );
}

function buildViewHref(filters: RecordRequestFilters, viewedAt: number): string {
  return buildRecordsViewSearchParams(filters, viewedAt).toString();
}

function buildEditHref(
  filters: RecordRequestFilters,
  viewedAt: number,
  refId: string,
): string {
  return buildRecordsViewSearchParams(filters, viewedAt, {
    edit: refId,
  }).toString();
}
