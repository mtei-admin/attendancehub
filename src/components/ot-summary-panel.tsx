"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCurrentCutoffPeriod,
  listCutoffPeriods,
  type CutoffPeriod,
} from "@/lib/cutoff";
import type { OtExportBasis, OtSummaryReport } from "@/lib/ot-summary";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";
import type { PayrollCutoffRule } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { OtManualOverrideModal } from "./ot-manual-override-modal";
import { OtSummarySettings } from "./ot-summary-settings";

type OtSummaryPanelProps = {
  payrollGroups: string[];
  cutoffRules: PayrollCutoffRule[];
  periodOptions: CutoffPeriod[];
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  report: OtSummaryReport | null;
  lifetimeHoursTotal: number | null;
  filters: {
    payrollGroup: string;
    periodId: string;
    startDate: string;
    endDate: string;
    useCustomRange: boolean;
    exportBasis: OtExportBasis;
    company: string;
    department: string;
    employeeName: string;
  };
  showSettings: boolean;
  saveCutoffRulesAction: (formData: FormData) => Promise<void>;
  saveOtEligibleTypesAction: (formData: FormData) => Promise<void>;
  eligibleTypes: { requestType: string; isActive: boolean }[];
  restrictRfToCheckedBasis?: boolean;
};

function periodsForPayrollGroup(
  cutoffRules: PayrollCutoffRule[],
  payrollGroup: string,
): CutoffPeriod[] {
  const rule = cutoffRules.find((item) => item.employeeType === payrollGroup);
  return rule ? listCutoffPeriods(rule) : [];
}

function defaultPeriodIdForGroup(
  cutoffRules: PayrollCutoffRule[],
  payrollGroup: string,
  preferredPeriodId?: string,
): string {
  const periods = periodsForPayrollGroup(cutoffRules, payrollGroup);
  if (preferredPeriodId && periods.some((period) => period.id === preferredPeriodId)) {
    return preferredPeriodId;
  }

  const rule = cutoffRules.find((item) => item.employeeType === payrollGroup);
  if (rule) {
    const current = getCurrentCutoffPeriod(rule);
    if (current) return current.id;
  }

  return periods[0]?.id ?? "";
}

function buildExportUrl(filters: OtSummaryPanelProps["filters"]): string {
  const params = new URLSearchParams();
  params.set("payroll_group", filters.payrollGroup);
  params.set("basis", filters.exportBasis);

  if (filters.useCustomRange) {
    params.set("start", filters.startDate);
    params.set("end", filters.endDate);
  } else if (filters.periodId) {
    params.set("period", filters.periodId);
  }

  if (filters.company) params.set("company", filters.company);
  if (filters.department) params.set("department", filters.department);
  if (filters.employeeName) params.set("employee", filters.employeeName);

  return `/api/export/ot-summary?${params.toString()}`;
}

export function OtSummaryPanel({
  payrollGroups,
  cutoffRules,
  periodOptions: _serverPeriodOptions,
  companies,
  employeesByCompanyDepartment,
  report,
  lifetimeHoursTotal,
  filters,
  showSettings,
  saveCutoffRulesAction,
  saveOtEligibleTypesAction,
  eligibleTypes,
  restrictRfToCheckedBasis = false,
}: OtSummaryPanelProps) {
  const [payrollGroup, setPayrollGroup] = useState(filters.payrollGroup);
  const [periodId, setPeriodId] = useState(() =>
    defaultPeriodIdForGroup(cutoffRules, filters.payrollGroup, filters.periodId),
  );
  const [company, setCompany] = useState(filters.company);
  const [department, setDepartment] = useState(filters.department);
  const [useCustomRange, setUseCustomRange] = useState(filters.useCustomRange);
  const [overrideOpen, setOverrideOpen] = useState(false);

  const periodOptions = useMemo(
    () => periodsForPayrollGroup(cutoffRules, payrollGroup),
    [cutoffRules, payrollGroup],
  );

  useEffect(() => {
    setPayrollGroup(filters.payrollGroup);
    setPeriodId(
      defaultPeriodIdForGroup(cutoffRules, filters.payrollGroup, filters.periodId),
    );
  }, [filters.payrollGroup, filters.periodId, cutoffRules]);

  const departments = useMemo(() => {
    if (!company) return [];
    return Object.keys(employeesByCompanyDepartment[company] ?? {}).sort();
  }, [company, employeesByCompanyDepartment]);

  const employees = useMemo(() => {
    if (!company || !department) return [];
    return employeesByCompanyDepartment[company]?.[department] ?? [];
  }, [company, department, employeesByCompanyDepartment]);

  const exportUrl = buildExportUrl({
    ...filters,
    payrollGroup,
    periodId,
    company,
    department,
    useCustomRange,
  });
  const canExport = Boolean(
    payrollGroup && (useCustomRange ? filters.startDate && filters.endDate : periodId),
  );

  const canManualOverride = Boolean(
    payrollGroup === "Confi" &&
      filters.exportBasis === "checked" &&
      company &&
      department &&
      filters.employeeName &&
      canExport,
  );

  const slipHoursTotal = useMemo(() => {
    if (!report || !filters.employeeName) return 0;
    return report.details
      .filter((row) => !row.isManualOverride && row.employeeName === filters.employeeName)
      .reduce((sum, row) => sum + row.otHrs, 0);
  }, [report, filters.employeeName]);

  const existingOverrideHours = useMemo(() => {
    if (!report || !filters.employeeName) return 0;
    const overrideRow = report.details.find(
      (row) => row.isManualOverride && row.employeeName === filters.employeeName,
    );
    return overrideRow?.otHrs ?? 0;
  }, [report, filters.employeeName]);

  const lockRfBasis = restrictRfToCheckedBasis && payrollGroup === "Rank & File";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">OT Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Summarize overtime and holiday/rest-day work by payroll cutoff period. Export includes
          detail lines and rollups by employee, department, and company.
        </p>
      </div>

      <OtSummarySettings
        open={showSettings}
        cutoffRules={cutoffRules}
        eligibleTypes={eligibleTypes}
        saveCutoffRulesAction={saveCutoffRulesAction}
        saveOtEligibleTypesAction={saveOtEligibleTypesAction}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <form method="GET" action="/hr" className="space-y-5">
          <input type="hidden" name="tab" value="ot-summary" />

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FormField label="Payroll group">
              <select
                name="ot_group"
                required
                value={payrollGroup}
                onChange={(event) => {
                  const nextGroup = event.target.value;
                  setPayrollGroup(nextGroup);
                  setPeriodId(defaultPeriodIdForGroup(cutoffRules, nextGroup));
                }}
                className={inputClassName}
              >
                {payrollGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Export basis">
              <select
                name="ot_basis"
                defaultValue={lockRfBasis ? "checked" : filters.exportBasis}
                className={inputClassName}
              >
                {!lockRfBasis && <option value="approved">Manager-approved</option>}
                <option value="checked">HR-checked (official)</option>
              </select>
            </FormField>

            <FormField label="Period mode">
              <select
                name="ot_custom"
                value={useCustomRange ? "1" : "0"}
                onChange={(event) => setUseCustomRange(event.target.value === "1")}
                className={inputClassName}
              >
                <option value="0">Cutoff period</option>
                <option value="1">Custom date range</option>
              </select>
            </FormField>
          </div>

          {!useCustomRange ? (
            <FormField label="Cutoff period">
              <select
                name="ot_period"
                value={periodId}
                onChange={(event) => setPeriodId(event.target.value)}
                className={inputClassName}
              >
                <option value="">— Select period —</option>
                {periodOptions.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label}
                  </option>
                ))}
              </select>
            </FormField>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              <FormField label="Period start">
                <input
                  type="date"
                  name="ot_start"
                  defaultValue={filters.startDate}
                  required
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Period end">
                <input
                  type="date"
                  name="ot_end"
                  defaultValue={filters.endDate}
                  required
                  className={inputClassName}
                />
              </FormField>
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-3">
            <FormField label="Company (optional)">
              <select
                name="ot_company"
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setDepartment("");
                }}
                className={inputClassName}
              >
                <option value="">All companies</option>
                {companies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Department (optional)">
              <select
                name="ot_department"
                value={department}
                disabled={!company}
                onChange={(event) => setDepartment(event.target.value)}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{company ? "All departments" : "Select company first"}</option>
                {departments.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Employee (optional)">
              <select
                name="ot_employee"
                defaultValue={filters.employeeName}
                disabled={!company || !department}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {company && department ? "All employees" : "Select department first"}
                </option>
                {employees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Preview summary
              </button>
              <a
                href={canExport ? exportUrl : "#"}
                aria-disabled={!canExport}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                  canExport
                    ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"
                    : "pointer-events-none border-slate-200 text-slate-400"
                }`}
              >
                Download CSV
              </a>
              <a
                href="/hr?tab=ot-summary&settings=1"
                className="text-sm font-medium text-slate-500 hover:text-slate-700"
              >
                Cutoff &amp; OT type settings
              </a>
            </div>

            <button
              type="button"
              disabled={!canManualOverride}
              onClick={() => setOverrideOpen(true)}
              title={
                canManualOverride
                  ? "Add or deduct manual OT hours for the selected Confi employee"
                  : "Select Confi, HR-checked, company, department, employee, and period"
              }
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Manual override
            </button>
          </div>
        </form>
      </section>

      <OtManualOverrideModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        employeeName={filters.employeeName}
        slipHoursTotal={slipHoursTotal}
        existingOverrideHours={existingOverrideHours}
        contextFields={{
          payrollGroup,
          exportBasis: filters.exportBasis,
          periodId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          useCustomRange,
          company,
          department,
        }}
      />

      {report && (
        <section className="space-y-4">
          {report.invalidOtWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {report.invalidOtWarnings.length} request(s) had invalid OT hours and were counted as
              0.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requests</p>
              <p className="mt-1 text-xs text-slate-500">This period</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{report.grandTotalRequests}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Period OT hours
              </p>
              <p className="mt-1 text-xs text-slate-500">Selected cutoff only</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {report.grandTotalHours.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Lifetime OT hours
              </p>
              <p className="mt-1 text-xs text-brand-600/80">HR-checked · all periods</p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">
                {lifetimeHoursTotal !== null ? lifetimeHoursTotal.toFixed(2) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Employees</p>
              <p className="mt-1 text-xs text-slate-500">This period</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{report.byEmployee.length}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Detail preview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {[
                      "Ref",
                      "Company",
                      "Department",
                      "Employee",
                      "Type",
                      "Date",
                      "OT hrs",
                      "Source",
                      "Checked",
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
                  {report.details.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        No OT-eligible requests in this period for the selected filters.
                      </td>
                    </tr>
                  ) : (
                    report.details.map((row) => (
                      <tr key={row.refId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.refId}</td>
                        <td className="px-4 py-3 text-slate-700">{row.company}</td>
                        <td className="px-4 py-3 text-slate-700">{row.department}</td>
                        <td className="px-4 py-3 text-slate-700">{row.employeeName}</td>
                        <td className="px-4 py-3 text-slate-700">{row.requestType}</td>
                        <td className="px-4 py-3 text-slate-700">{row.dateOfIncident}</td>
                        <td className="px-4 py-3 text-slate-700">{row.otHrs.toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {row.isManualOverride ? "Manual" : "Slip"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.hrChecked ? "Yes" : "No"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {report.byEmployee.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="text-lg font-semibold text-slate-900">Rollup by employee</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      {["Employee", "Requests", "Period OT hours"].map((header) => (
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
                    {report.byEmployee.map((row) => (
                      <tr key={row.key}>
                        <td className="px-4 py-3 font-medium text-slate-900">{row.label}</td>
                        <td className="px-4 py-3 text-slate-700">{row.requestCount}</td>
                        <td className="px-4 py-3 text-slate-700">{row.totalHours.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
