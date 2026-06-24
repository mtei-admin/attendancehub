import {
  saveEmployeeRosterAction,
  saveHrCompanyAction,
  saveManagerAction,
  saveOtEligibleTypesAction,
  savePayrollCutoffRulesAction,
} from "@/actions/hr";
import { FlashMessage } from "@/components/flash-message";
import { CompanyPanel } from "@/components/company-panel";
import { HrRecordsList } from "@/components/hr-records-list";
import { HrTabs, type HrTab } from "@/components/hr-tabs";
import { OtSummaryPanel } from "@/components/ot-summary-panel";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { listCutoffPeriods, parseCutoffPeriodId } from "@/lib/cutoff";
import { listDepartments } from "@/lib/departments";
import {
  allowedPayrollGroups,
  getPayrollCutoffRule,
  listOtEligibleTypes,
  listPayrollCutoffRules,
} from "@/lib/ot-settings";
import { buildOtSummaryReport, type OtExportBasis } from "@/lib/ot-summary";
import {
  getAllApprovedRequests,
  getApprovedRequests,
  getArchivedRequests,
} from "@/lib/requests";
import {
  buildEmployeeTypeLookup,
  buildEmployeesByCompanyDepartment,
  filterRequestsByHrScope,
  listEmployees,
} from "@/lib/roster";
import { listUsersByRole } from "@/lib/users";
import { redirect } from "next/navigation";

type HrPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    add?: string;
    success?: string;
    error?: string;
    settings?: string;
    ot_group?: string;
    ot_period?: string;
    ot_start?: string;
    ot_end?: string;
    ot_custom?: string;
    ot_basis?: string;
    ot_company?: string;
    ot_department?: string;
    ot_employee?: string;
  }>;
};

function resolveTab(tab?: string): HrTab {
  if (
    tab === "checked" ||
    tab === "all" ||
    tab === "employees" ||
    tab === "managers" ||
    tab === "companies" ||
    tab === "ot-summary"
  ) {
    return tab;
  }
  return "pending";
}

function parseExportBasis(value?: string): OtExportBasis {
  return value === "checked" ? "checked" : "approved";
}

export default async function HrPage({ searchParams }: HrPageProps) {
  const params = await searchParams;
  const activeTab = resolveTab(params.tab);
  const editId = params.edit ? Number(params.edit) : undefined;

  const session = await getSession();
  if (!session) redirect("/");

  const hrScope = session.role === "HR" ? session.hrScope : null;
  const payrollGroups = allowedPayrollGroups(hrScope);

  const [
    pendingRaw,
    checkedRaw,
    allRaw,
    employees,
    companies,
    departments,
    managers,
    roster,
    cutoffRules,
    eligibleTypes,
  ] = await Promise.all([
    getApprovedRequests(),
    getArchivedRequests(),
    getAllApprovedRequests(),
    listEmployees(),
    listCompanies(),
    listDepartments(),
    listUsersByRole("Manager"),
    listEmployees(true),
    listPayrollCutoffRules(),
    listOtEligibleTypes(),
  ]);

  const activeCompanies = companies.filter((company) => company.isActive);
  const companyNames = activeCompanies.map((company) => company.name);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);
  const pendingRequests = filterRequestsByHrScope(pendingRaw, employeeTypeLookup, hrScope);
  const checkedRequests = filterRequestsByHrScope(checkedRaw, employeeTypeLookup, hrScope);
  const allRequests = filterRequestsByHrScope(allRaw, employeeTypeLookup, hrScope);

  const otPayrollGroup =
    params.ot_group && payrollGroups.includes(params.ot_group)
      ? params.ot_group
      : payrollGroups[0] ?? "Rank & File";
  const otUseCustomRange = params.ot_custom === "1";
  const otExportBasis = parseExportBasis(params.ot_basis);
  const otPeriodId = params.ot_period?.trim() ?? "";
  const otStartDate = params.ot_start?.trim() ?? "";
  const otEndDate = params.ot_end?.trim() ?? "";

  const otCutoffRule = await getPayrollCutoffRule(otPayrollGroup);
  const otPeriodOptions = otCutoffRule ? listCutoffPeriods(otCutoffRule) : [];

  let otResolvedStart = otStartDate;
  let otResolvedEnd = otEndDate;
  if (!otUseCustomRange && otPeriodId) {
    const parsedPeriod = parseCutoffPeriodId(otPeriodId);
    if (parsedPeriod) {
      otResolvedStart = parsedPeriod.startDate;
      otResolvedEnd = parsedPeriod.endDate;
    }
  }

  const otHasPeriod =
    Boolean(otResolvedStart && otResolvedEnd) &&
    otResolvedStart <= otResolvedEnd &&
    (otUseCustomRange ? Boolean(otStartDate && otEndDate) : Boolean(otPeriodId));

  const otReport =
    activeTab === "ot-summary" && otHasPeriod
      ? await buildOtSummaryReport({
          startDate: otResolvedStart,
          endDate: otResolvedEnd,
          exportBasis: otExportBasis,
          payrollGroup: otPayrollGroup,
          company: params.ot_company?.trim() || undefined,
          department: params.ot_department?.trim() || undefined,
          employeeName: params.ot_employee?.trim() || undefined,
          employeeTypeLookup,
          hrScope,
        })
      : null;

  return (
    <>
      <HrTabs
        activeTab={activeTab}
        pendingCount={pendingRequests.length}
        checkedCount={checkedRequests.length}
        allCount={allRequests.length}
        companyCount={activeCompanies.length}
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {activeTab === "pending" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={pendingRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="pending"
              emptyMessage="No pending records to review."
            />
          </section>
        )}

        {activeTab === "checked" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={checkedRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="checked"
              emptyMessage="No checked records yet."
            />
          </section>
        )}

        {activeTab === "all" && (
          <section className="space-y-4">
            {allRequests.length > 0 && (
              <div className="flex justify-end">
                <a
                  href="/api/export/csv"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Download CSV for Payroll
                </a>
              </div>
            )}
            <HrRecordsList
              requests={allRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="all"
              emptyMessage="No records to display."
            />
          </section>
        )}

        {activeTab === "employees" && (
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Employee Roster</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add or update employees available in the submission form.
              </p>
            </div>
            <RosterPanel
              employees={employees}
              departments={departments}
              companies={companyNames}
              saveAction={saveEmployeeRosterAction}
              editId={editId}
              showAdd={params.add === "1"}
              activeOnly={false}
              basePath="/hr"
              tab="employees"
            />
          </section>
        )}

        {activeTab === "managers" && (
          <PortalUserPanel
            users={managers}
            departments={departments}
            companies={companyNames}
            saveAction={saveManagerAction}
            role="Manager"
            editId={editId}
            showAdd={params.add === "1"}
            basePath="/hr"
            tab="managers"
          />
        )}

        {activeTab === "companies" && (
          <CompanyPanel
            companies={companies}
            saveAction={saveHrCompanyAction}
            editId={editId}
            showAdd={params.add === "1"}
            basePath="/hr"
            tab="companies"
          />
        )}

        {activeTab === "ot-summary" && (
          <OtSummaryPanel
            payrollGroups={payrollGroups}
            cutoffRules={cutoffRules}
            periodOptions={otPeriodOptions}
            companies={companyNames}
            employeesByCompanyDepartment={employeesByCompanyDepartment}
            report={otReport}
            filters={{
              payrollGroup: otPayrollGroup,
              periodId: otPeriodId,
              startDate: otStartDate,
              endDate: otEndDate,
              useCustomRange: otUseCustomRange,
              exportBasis: otExportBasis,
              company: params.ot_company?.trim() ?? "",
              department: params.ot_department?.trim() ?? "",
              employeeName: params.ot_employee?.trim() ?? "",
            }}
            showSettings={params.settings === "1"}
            saveCutoffRulesAction={savePayrollCutoffRulesAction}
            saveOtEligibleTypesAction={saveOtEligibleTypesAction}
            eligibleTypes={eligibleTypes}
          />
        )}
      </div>
    </>
  );
}
