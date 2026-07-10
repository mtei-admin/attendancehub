import {
  saveEmployeeRosterAction,
  saveHrCompanyAction,
  saveManagerAction,
  saveVerifierAction,
  saveOtEligibleTypesAction,
  savePayrollCutoffRulesAction,
} from "@/actions/hr";
import { FlashMessage } from "@/components/flash-message";
import { CompanyPanel } from "@/components/company-panel";
import { HrRecordsList } from "@/components/hr-records-list";
import { PayrollOfficerTabs } from "@/components/payroll-officer-tabs";
import { PayrollRfPanel } from "@/components/payroll-rf-panel";
import { OtSummaryPanel } from "@/components/ot-summary-panel";
import { RecordRequestLogsPanel } from "@/components/record-request-logs-panel";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { HrTabs, type HrTab } from "@/components/hr-tabs";
import { getCurrentCutoffPeriod, listCutoffPeriods, parseCutoffPeriodId } from "@/lib/cutoff";
import { listDepartments } from "@/lib/departments";
import {
  canAccessHrPortal,
  filterPayrollOfficerConfiRequests,
  filterPayrollOfficerRfRequests,
  filterRequestsForHrPortal,
  isPayrollOfficerRole,
  payrollOfficerConfiView,
  resolveOtSummaryHrScope,
  resolvePayrollOfficerTab,
} from "@/lib/hr-portal-access";
import {
  allowedPayrollGroups,
  getPayrollCutoffRule,
  listOtEligibleTypes,
  listPayrollCutoffRules,
} from "@/lib/ot-settings";
import { buildOtSummaryReport, type OtExportBasis } from "@/lib/ot-summary";
import { listRecordRequestLogs } from "@/lib/record-requests";
import {
  getAllApprovedRequests,
  getApprovedRequests,
  getArchivedRequests,
} from "@/lib/requests";
import {
  buildEmployeeTypeLookup,
  buildEmployeesByCompanyDepartment,
  listEmployees,
} from "@/lib/roster";
import { listUsersByRole } from "@/lib/users";
import { redirect } from "next/navigation";

type HrPageProps = {
  searchParams: Promise<{
    tab?: string;
    period?: string;
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
    tab === "verifiers" ||
    tab === "companies" ||
    tab === "ot-summary" ||
    tab === "record-logs"
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
  const session = await getSession();
  if (!session || !canAccessHrPortal(session.role)) redirect("/");

  const isPayrollOfficer = isPayrollOfficerRole(session.role);
  const payrollOfficerTab = isPayrollOfficer ? resolvePayrollOfficerTab(params.tab) : null;
  const activeTab = isPayrollOfficer ? payrollOfficerTab! : resolveTab(params.tab);
  const editId = params.edit ? Number(params.edit) : undefined;

  const payrollGroups = allowedPayrollGroups(session.role, session.hrScope);

  const [
    pendingRaw,
    checkedRaw,
    allRaw,
    employees,
    companies,
    departments,
    managers,
    verifiers,
    roster,
    cutoffRules,
    eligibleTypes,
    recordRequestLogs,
  ] = await Promise.all([
    getApprovedRequests(),
    getArchivedRequests(),
    getAllApprovedRequests(),
    listEmployees(),
    listCompanies(),
    listDepartments(),
    listUsersByRole("Manager"),
    listUsersByRole("Verifier"),
    listEmployees(true),
    listPayrollCutoffRules(),
    listOtEligibleTypes(),
    listRecordRequestLogs(),
  ]);

  const activeCompanies = companies.filter((company) => company.isActive);
  const companyNames = activeCompanies.map((company) => company.name);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);

  const confiPendingRequests = isPayrollOfficer
    ? filterPayrollOfficerConfiRequests(pendingRaw, employeeTypeLookup, "pending")
    : [];
  const confiCheckedRequests = isPayrollOfficer
    ? filterPayrollOfficerConfiRequests(checkedRaw, employeeTypeLookup, "checked")
    : [];
  const confiAllRequests = isPayrollOfficer
    ? filterPayrollOfficerConfiRequests(allRaw, employeeTypeLookup, "all")
    : [];

  const rfCutoffRule = isPayrollOfficer ? await getPayrollCutoffRule("Rank & File") : null;
  const rfPeriodOptions = rfCutoffRule ? listCutoffPeriods(rfCutoffRule) : [];
  const defaultRfPeriod =
    (params.period && parseCutoffPeriodId(params.period) ? params.period : null) ??
    (rfCutoffRule ? getCurrentCutoffPeriod(rfCutoffRule)?.id : null) ??
    rfPeriodOptions[0]?.id ??
    "";
  const parsedRfPeriod = defaultRfPeriod ? parseCutoffPeriodId(defaultRfPeriod) : null;
  const rfRequests =
    isPayrollOfficer && parsedRfPeriod
      ? filterPayrollOfficerRfRequests(
          checkedRaw,
          employeeTypeLookup,
          parsedRfPeriod.startDate,
          parsedRfPeriod.endDate,
        )
      : [];
  const selectedRfPeriodLabel =
    rfPeriodOptions.find((period) => period.id === defaultRfPeriod)?.label ?? defaultRfPeriod;

  const pendingRequests = isPayrollOfficer
    ? confiPendingRequests
    : filterRequestsForHrPortal(pendingRaw, employeeTypeLookup, session, "pending");
  const checkedRequests = isPayrollOfficer
    ? confiCheckedRequests
    : filterRequestsForHrPortal(checkedRaw, employeeTypeLookup, session, "checked");
  const allRequests = isPayrollOfficer
    ? confiAllRequests
    : filterRequestsForHrPortal(allRaw, employeeTypeLookup, session, "all");

  const confiView = isPayrollOfficer && payrollOfficerTab ? payrollOfficerConfiView(payrollOfficerTab) : null;

  const otPayrollGroup =
    params.ot_group && payrollGroups.includes(params.ot_group)
      ? params.ot_group
      : payrollGroups[0] ?? "Rank & File";
  const otUseCustomRange = params.ot_custom === "1";
  const otExportBasis =
    session.role === "Payroll Officer" && otPayrollGroup === "Rank & File"
      ? "checked"
      : parseExportBasis(params.ot_basis);
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
          hrScope: resolveOtSummaryHrScope(session, otPayrollGroup),
        })
      : null;

  return (
    <>
      {isPayrollOfficer && payrollOfficerTab ? (
        <PayrollOfficerTabs
          activeTab={payrollOfficerTab}
          rfCount={rfRequests.length}
          confiPendingCount={confiPendingRequests.length}
          confiCheckedCount={confiCheckedRequests.length}
          confiAllCount={confiAllRequests.length}
          companyCount={activeCompanies.length}
          rfPeriodId={defaultRfPeriod || undefined}
        />
      ) : (
        <HrTabs
          activeTab={activeTab as HrTab}
          pendingCount={pendingRequests.length}
          checkedCount={checkedRequests.length}
          allCount={allRequests.length}
          companyCount={activeCompanies.length}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        {isPayrollOfficer && payrollOfficerTab === "rf" && (
          <PayrollRfPanel
            requests={rfRequests}
            employeeTypeLookup={employeeTypeLookup}
            periodOptions={rfPeriodOptions}
            selectedPeriodId={defaultRfPeriod}
            selectedPeriodLabel={selectedRfPeriodLabel}
          />
        )}

        {isPayrollOfficer && confiView === "pending" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={confiPendingRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="pending"
              emptyMessage="No pending Confi records to review."
            />
          </section>
        )}

        {isPayrollOfficer && confiView === "checked" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={confiCheckedRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="checked"
              emptyMessage="No checked Confi records yet."
            />
          </section>
        )}

        {isPayrollOfficer && confiView === "all" && (
          <section className="space-y-4">
            {confiAllRequests.length > 0 && (
              <div className="flex justify-end">
                <a
                  href="/api/export/csv?group=confi"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Download CSV for Payroll
                </a>
              </div>
            )}
            <HrRecordsList
              requests={confiAllRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="all"
              emptyMessage="No Confi records to display."
            />
          </section>
        )}

        {!isPayrollOfficer && activeTab === "pending" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={pendingRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="pending"
              emptyMessage="No pending records to review."
            />
          </section>
        )}

        {!isPayrollOfficer && activeTab === "checked" && (
          <section className="space-y-4">
            <HrRecordsList
              requests={checkedRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="checked"
              emptyMessage="No checked records yet."
            />
          </section>
        )}

        {!isPayrollOfficer && activeTab === "all" && (
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

        {activeTab === "verifiers" && (
          <PortalUserPanel
            users={verifiers}
            departments={departments}
            companies={companyNames}
            saveAction={saveVerifierAction}
            role="Verifier"
            editId={editId}
            showAdd={params.add === "1"}
            basePath="/hr"
            tab="verifiers"
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
            restrictRfToCheckedBasis={session.role === "Payroll Officer"}
          />
        )}

        {activeTab === "record-logs" && <RecordRequestLogsPanel logs={recordRequestLogs} />}
      </div>
    </>
  );
}
