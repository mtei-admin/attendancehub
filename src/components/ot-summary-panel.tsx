"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getCurrentCutoffPeriod,
  listCutoffPeriods,
  type CutoffPeriod,
} from "@/lib/cutoff";
import type { OtOffsetBalanceListRow } from "@/lib/ot-offset-balance";
import type { OtExportBasis, OtSummaryReport } from "@/lib/ot-summary";
import type { EmployeesByCompanyDepartment } from "@/lib/roster";
import type { PayrollCutoffRule } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { OtManualOverrideModal } from "./ot-manual-override-modal";
import { OtSummarySettings } from "./ot-summary-settings";

type OtSummaryFilters = {
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

type OtSummaryPanelProps = {
  payrollGroups: string[];
  cutoffRules: PayrollCutoffRule[];
  periodOptions: CutoffPeriod[];
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  balanceRows: OtOffsetBalanceListRow[];
  report: OtSummaryReport | null;
  availableOtOffsetBalance: number | null;
  view: "list" | "detail";
  showAll: boolean;
  filters: OtSummaryFilters;
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

function buildExportUrl(filters: OtSummaryFilters): string {
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

function buildListHref(payrollGroup: string, showAll: boolean, settings = false): string {
  const params = new URLSearchParams({ tab: "ot-summary", ot_group: payrollGroup });
  if (showAll) params.set("ot_show_all", "1");
  if (settings) params.set("settings", "1");
  return `/hr?${params.toString()}`;
}

function buildDetailHref(input: {
  payrollGroup: string;
  company: string;
  department: string;
  employeeName: string;
  periodId: string;
  exportBasis: OtExportBasis;
  showAll: boolean;
}): string {
  const params = new URLSearchParams({
    tab: "ot-summary",
    ot_view: "detail",
    ot_group: input.payrollGroup,
    ot_company: input.company,
    ot_department: input.department,
    ot_employee: input.employeeName,
    ot_basis: input.exportBasis,
    ot_custom: "0",
  });
  if (input.periodId) params.set("ot_period", input.periodId);
  if (input.showAll) params.set("ot_show_all", "1");
  return `/hr?${params.toString()}`;
}

export function OtSummaryPanel({
  payrollGroups,
  cutoffRules,
  periodOptions: _serverPeriodOptions,
  companies,
  employeesByCompanyDepartment,
  balanceRows,
  report,
  availableOtOffsetBalance,
  view,
  showAll,
  filters,
  showSettings,
  saveCutoffRulesAction,
  saveOtEligibleTypesAction,
  eligibleTypes,
  restrictRfToCheckedBasis = false,
}: OtSummaryPanelProps) {
  if (view === "detail") {
    return (
      <OtSummaryDetail
        payrollGroups={payrollGroups}
        cutoffRules={cutoffRules}
        companies={companies}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
        report={report}
        availableOtOffsetBalance={availableOtOffsetBalance}
        filters={filters}
        showAll={showAll}
        showSettings={showSettings}
        saveCutoffRulesAction={saveCutoffRulesAction}
        saveOtEligibleTypesAction={saveOtEligibleTypesAction}
        eligibleTypes={eligibleTypes}
        restrictRfToCheckedBasis={restrictRfToCheckedBasis}
      />
    );
  }

  return (
    <OtSummaryList
      payrollGroups={payrollGroups}
      cutoffRules={cutoffRules}
      balanceRows={balanceRows}
      filters={filters}
      showAll={showAll}
      showSettings={showSettings}
      saveCutoffRulesAction={saveCutoffRulesAction}
      saveOtEligibleTypesAction={saveOtEligibleTypesAction}
      eligibleTypes={eligibleTypes}
      restrictRfToCheckedBasis={restrictRfToCheckedBasis}
    />
  );
}

function OtSummaryList({
  payrollGroups,
  cutoffRules,
  balanceRows,
  filters,
  showAll,
  showSettings,
  saveCutoffRulesAction,
  saveOtEligibleTypesAction,
  eligibleTypes,
  restrictRfToCheckedBasis = false,
}: {
  payrollGroups: string[];
  cutoffRules: PayrollCutoffRule[];
  balanceRows: OtOffsetBalanceListRow[];
  filters: OtSummaryFilters;
  showAll: boolean;
  showSettings: boolean;
  saveCutoffRulesAction: (formData: FormData) => Promise<void>;
  saveOtEligibleTypesAction: (formData: FormData) => Promise<void>;
  eligibleTypes: { requestType: string; isActive: boolean }[];
  restrictRfToCheckedBasis?: boolean;
}) {
  const [payrollGroup, setPayrollGroup] = useState(filters.payrollGroup);
  const [showAllLocal, setShowAllLocal] = useState(showAll);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setPayrollGroup(filters.payrollGroup);
  }, [filters.payrollGroup]);

  useEffect(() => {
    setShowAllLocal(showAll);
  }, [showAll]);

  const lockRfBasis = restrictRfToCheckedBasis && payrollGroup === "Rank & File";
  const exportBasis: OtExportBasis = lockRfBasis ? "checked" : filters.exportBasis || "checked";
  const defaultPeriodId = defaultPeriodIdForGroup(cutoffRules, payrollGroup);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return balanceRows.filter((row) => {
      if (!showAllLocal && row.availableBalance <= 0) return false;
      if (!query) return true;
      return (
        row.employeeName.toLowerCase().includes(query) ||
        row.company.toLowerCase().includes(query) ||
        row.department.toLowerCase().includes(query)
      );
    });
  }, [balanceRows, showAllLocal, search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">OT Summary</h2>
        <p className="mt-1 text-sm text-slate-500">
          Browse Available OT Offset Balance by employee. Open a row for period preview, CSV export,
          and manual override.
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
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Payroll group">
              <select
                value={payrollGroup}
                onChange={(event) => {
                  const nextGroup = event.target.value;
                  setPayrollGroup(nextGroup);
                  window.location.href = buildListHref(nextGroup, showAllLocal);
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

            <FormField label="Search" className="md:col-span-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filter by name, company, or department"
                className={inputClassName}
              />
            </FormField>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={showAllLocal}
                onChange={(event) => setShowAllLocal(event.target.checked)}
                className="rounded border-slate-300 text-brand-600"
              />
              Show All
            </label>

            <a
              href={buildListHref(payrollGroup, showAllLocal, true)}
              className="text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Cutoff &amp; OT type settings
            </a>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Employees</h3>
          <p className="mt-1 text-sm text-slate-500">
            {showAllLocal
              ? "All employees in this payroll group."
              : "Showing Available OT Offset Balance greater than zero."}{" "}
            {visibleRows.length} row{visibleRows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {["Name", "Company", "Department", "Available OT Offset Balance"].map((header) => (
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
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    {showAllLocal
                      ? "No employees found for this payroll group."
                      : "No employees with Available OT Offset Balance greater than zero. Turn on Show All to see everyone."}
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => (
                  <tr key={`${row.company}|${row.department}|${row.employeeName}`} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <a
                        href={buildDetailHref({
                          payrollGroup,
                          company: row.company,
                          department: row.department,
                          employeeName: row.employeeName,
                          periodId: defaultPeriodId,
                          exportBasis,
                          showAll: showAllLocal,
                        })}
                        className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        {row.employeeName}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.company}</td>
                    <td className="px-4 py-3 text-slate-700">{row.department}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.availableBalance.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OtSummaryDetail({
  payrollGroups,
  cutoffRules,
  companies,
  employeesByCompanyDepartment,
  report,
  availableOtOffsetBalance,
  filters,
  showAll,
  showSettings,
  saveCutoffRulesAction,
  saveOtEligibleTypesAction,
  eligibleTypes,
  restrictRfToCheckedBasis = false,
}: {
  payrollGroups: string[];
  cutoffRules: PayrollCutoffRule[];
  companies: string[];
  employeesByCompanyDepartment: EmployeesByCompanyDepartment;
  report: OtSummaryReport | null;
  availableOtOffsetBalance: number | null;
  filters: OtSummaryFilters;
  showAll: boolean;
  showSettings: boolean;
  saveCutoffRulesAction: (formData: FormData) => Promise<void>;
  saveOtEligibleTypesAction: (formData: FormData) => Promise<void>;
  eligibleTypes: { requestType: string; isActive: boolean }[];
  restrictRfToCheckedBasis?: boolean;
}) {
  const [payrollGroup, setPayrollGroup] = useState(filters.payrollGroup);
  const [periodId, setPeriodId] = useState(() =>
    defaultPeriodIdForGroup(cutoffRules, filters.payrollGroup, filters.periodId),
  );
  const [company, setCompany] = useState(filters.company);
  const [department, setDepartment] = useState(filters.department);
  const [employeeName, setEmployeeName] = useState(filters.employeeName);
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
    setCompany(filters.company);
    setDepartment(filters.department);
    setEmployeeName(filters.employeeName);
    setUseCustomRange(filters.useCustomRange);
  }, [
    filters.payrollGroup,
    filters.periodId,
    filters.company,
    filters.department,
    filters.employeeName,
    filters.useCustomRange,
    cutoffRules,
  ]);

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
    employeeName,
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
      employeeName &&
      canExport,
  );

  const slipHoursTotal = useMemo(() => {
    if (!report || !employeeName) return 0;
    return report.details
      .filter((row) => !row.isManualOverride && row.employeeName === employeeName)
      .reduce((sum, row) => sum + row.otHrs, 0);
  }, [report, employeeName]);

  const existingOverrideHours = useMemo(() => {
    if (!report || !employeeName) return 0;
    const overrideRow = report.details.find(
      (row) => row.isManualOverride && row.employeeName === employeeName,
    );
    return overrideRow?.otHrs ?? 0;
  }, [report, employeeName]);

  const lockRfBasis = restrictRfToCheckedBasis && payrollGroup === "Rank & File";
  const backHref = buildListHref(filters.payrollGroup || payrollGroup, showAll);

  return (
    <div className="space-y-6">
      <div>
        <a
          href={backHref}
          className="text-sm font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          ← Back to employee list
        </a>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">OT Summary detail</h2>
        <p className="mt-1 text-sm text-slate-500">
          Period preview, CSV export, and manual override for the selected employee.
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
          <input type="hidden" name="ot_view" value="detail" />
          {showAll && <input type="hidden" name="ot_show_all" value="1" />}

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
            <FormField label="Company">
              <select
                name="ot_company"
                required
                value={company}
                onChange={(event) => {
                  setCompany(event.target.value);
                  setDepartment("");
                  setEmployeeName("");
                }}
                className={inputClassName}
              >
                <option value="">— Select company —</option>
                {companies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Department">
              <select
                name="ot_department"
                required
                value={department}
                disabled={!company}
                onChange={(event) => {
                  setDepartment(event.target.value);
                  setEmployeeName("");
                }}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{company ? "— Select department —" : "Select company first"}</option>
                {departments.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Employee">
              <select
                name="ot_employee"
                required
                value={employeeName}
                disabled={!company || !department}
                onChange={(event) => setEmployeeName(event.target.value)}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {company && department ? "— Select employee —" : "Select department first"}
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
                href={`${backHref}&settings=1`}
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
        employeeName={employeeName || filters.employeeName}
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
                Available OT Offset Balance
              </p>
              <p className="mt-1 text-xs text-brand-600/80">Credits − OT Offset · lifetime</p>
              <p className="mt-1 text-2xl font-semibold text-brand-900">
                {availableOtOffsetBalance !== null ? availableOtOffsetBalance.toFixed(2) : "—"}
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
