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
import { HrAllRecordsCutoffBar } from "@/components/hr-all-records-cutoff-bar";
import { HrRecordsList } from "@/components/hr-records-list";
import { HrSlipEditModal } from "@/components/hr-slip-edit-modal";
import { PayrollOfficerTabs } from "@/components/payroll-officer-tabs";
import { PayrollRfPanel } from "@/components/payroll-rf-panel";
import { OtSummaryPanel } from "@/components/ot-summary-panel";
import { RecordRequestLogsPanel } from "@/components/record-request-logs-panel";
import { PortalUserPanel } from "@/components/portal-user-panel";
import { RosterPanel } from "@/components/roster-panel";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
import { HrTabs, type HrTab } from "@/components/hr-tabs";
import { getCurrentCutoffPeriod, getLastClosedCutoffPeriod, listCutoffPeriods, parseCutoffPeriodId } from "@/lib/cutoff";
import { listDepartments } from "@/lib/departments";
import {
  canAccessHrPortal,
  canHrEditRequest,
  filterPayrollOfficerConfiRequests,
  filterPayrollOfficerRfRequests,
  filterRequestsByIncidentCutoff,
  filterRequestsForHrPortal,
  isPayrollOfficerRole,
  payrollOfficerConfiView,
  resolveOtSummaryHrScope,
  resolvePayrollOfficerTab,
} from "@/lib/hr-portal-access";
import type { AttendanceRequest } from "@/lib/schema";
import { requestEmployeeKey } from "@/lib/roster";
import {
  computeOtClaimedHoursForPlacement,
  listOtClaimedHoursByPayrollGroup,
} from "@/lib/ot-claimed";
import {
  allowedPayrollGroups,
  getActiveOtEligibleTypes,
  getPayrollCutoffRule,
  listOtEligibleTypes,
  listPayrollCutoffRules,
} from "@/lib/ot-settings";
import { buildOtSummaryReport, type OtExportBasis } from "@/lib/ot-summary";
import {
  computeAvailableOtOffsetBalance,
  listOtOffsetBalancesByPayrollGroup,
} from "@/lib/ot-offset-balance";
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
    ot_view?: string;
    ot_show_all?: string;
    edit_ref?: string;
  }>;
};

function buildHrTabHref(tab: string, period?: string, editRef?: string): string {
  const search = new URLSearchParams({ tab });
  if (period) search.set("period", period);
  if (editRef) search.set("edit_ref", editRef);
  return `/hr?${search.toString()}`;
}

function buildEditableRefIds(
  requests: AttendanceRequest[],
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>,
  employeeTypeLookup: Record<string, string>,
): Set<string> {
  return new Set(
    requests
      .filter((request) => canHrEditRequest(request, session, employeeTypeLookup))
      .map((request) => request.refId),
  );
}

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
  const allRequestsRaw = isPayrollOfficer
    ? confiAllRequests
    : filterRequestsForHrPortal(allRaw, employeeTypeLookup, session, "all");

  const isHrRfAllCutoff = !isPayrollOfficer && session.hrScope === "R&F only";
  const hrAllCutoffRule = isHrRfAllCutoff ? await getPayrollCutoffRule("Rank & File") : null;
  const hrAllPeriodOptions = hrAllCutoffRule ? listCutoffPeriods(hrAllCutoffRule) : [];
  const defaultHrAllPeriod =
    (isHrRfAllCutoff && params.period && parseCutoffPeriodId(params.period)
      ? params.period
      : null) ??
    (hrAllCutoffRule ? getCurrentCutoffPeriod(hrAllCutoffRule)?.id : null) ??
    hrAllPeriodOptions[0]?.id ??
    "";
  const parsedHrAllPeriod = defaultHrAllPeriod ? parseCutoffPeriodId(defaultHrAllPeriod) : null;
  const allRequests =
    isHrRfAllCutoff && parsedHrAllPeriod
      ? filterRequestsByIncidentCutoff(
          allRequestsRaw,
          parsedHrAllPeriod.startDate,
          parsedHrAllPeriod.endDate,
        )
      : allRequestsRaw;
  const selectedHrAllPeriodLabel =
    hrAllPeriodOptions.find((period) => period.id === defaultHrAllPeriod)?.label ??
    defaultHrAllPeriod;
  const hrAllExportHref = defaultHrAllPeriod
    ? `/api/export/csv?period=${encodeURIComponent(defaultHrAllPeriod)}`
    : "/api/export/csv";

  const confiView = isPayrollOfficer && payrollOfficerTab ? payrollOfficerConfiView(payrollOfficerTab) : null;

  const hrListTab = isPayrollOfficer
    ? confiView === "checked"
      ? "confi-checked"
      : confiView === "all"
        ? "confi-all"
        : confiView === "pending"
          ? "confi-pending"
          : payrollOfficerTab ?? "confi-pending"
    : activeTab;

  const editRefId = params.edit_ref?.trim() ?? "";
  const hrPanelHref = buildHrTabHref(
    typeof hrListTab === "string" ? hrListTab : "pending",
    isPayrollOfficer && payrollOfficerTab === "rf"
      ? defaultRfPeriod
      : isHrRfAllCutoff && (activeTab as HrTab) === "all"
        ? defaultHrAllPeriod
        : undefined,
  );
  const getHrEditHref = (refId: string) =>
    buildHrTabHref(
      typeof hrListTab === "string" ? hrListTab : "pending",
      isPayrollOfficer && payrollOfficerTab === "rf"
        ? defaultRfPeriod
        : isHrRfAllCutoff && (activeTab as HrTab) === "all"
          ? defaultHrAllPeriod
          : undefined,
      refId,
    );

  const editablePendingRefIds = buildEditableRefIds(
    isPayrollOfficer ? confiPendingRequests : pendingRequests,
    session,
    employeeTypeLookup,
  );
  const editableCheckedRefIds = buildEditableRefIds(
    isPayrollOfficer ? confiCheckedRequests : checkedRequests,
    session,
    employeeTypeLookup,
  );

  const editCandidates: AttendanceRequest[] = [
    ...pendingRequests,
    ...checkedRequests,
    ...confiPendingRequests,
    ...confiCheckedRequests,
  ];
  const editingRequest = editRefId
    ? editCandidates.find((request) => request.refId === editRefId)
    : undefined;
  const showHrEditModal = Boolean(
    editingRequest &&
      canHrEditRequest(editingRequest, session, employeeTypeLookup),
  );
  const editingEmployeeType = editingRequest
    ? employeeTypeLookup[requestEmployeeKey(editingRequest)]
    : undefined;

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

  const otView =
    activeTab === "ot-summary" && params.ot_view === "detail" ? "detail" : "list";
  const otShowAll = params.ot_show_all === "1";
  const otDetailCompany = params.ot_company?.trim() ?? "";
  const otDetailDepartment = params.ot_department?.trim() ?? "";
  const otDetailEmployee = params.ot_employee?.trim() ?? "";

  const otEligibleTypesForBalance =
    activeTab === "ot-summary" ? await getActiveOtEligibleTypes() : [];

  const otIsRf = otPayrollGroup === "Rank & File";
  const otLastClosedPeriod =
    activeTab === "ot-summary" && otCutoffRule
      ? getLastClosedCutoffPeriod(otCutoffRule)
      : null;

  let otListRows: { company: string; department: string; employeeName: string; metricValue: number }[] =
    [];
  let otListMetric: "offset_balance" | "latest_claimed" = "offset_balance";
  let otListPeriodLabel: string | null = null;

  if (activeTab === "ot-summary") {
    if (otIsRf && otLastClosedPeriod) {
      const claimedRows = await listOtClaimedHoursByPayrollGroup({
        payrollGroup: otPayrollGroup,
        roster,
        otEligibleTypes: otEligibleTypesForBalance,
        startDate: otLastClosedPeriod.startDate,
        endDate: otLastClosedPeriod.endDate,
      });
      otListRows = claimedRows.map((row) => ({
        company: row.company,
        department: row.department,
        employeeName: row.employeeName,
        metricValue: row.claimedHours,
      }));
      otListMetric = "latest_claimed";
      otListPeriodLabel = otLastClosedPeriod.label;
    } else if (otIsRf) {
      otListMetric = "latest_claimed";
      otListRows = roster
        .filter((employee) => employee.employeeType === otPayrollGroup)
        .map((employee) => ({
          company: employee.companyName,
          department: employee.departmentName,
          employeeName: employee.fullName,
          metricValue: 0,
        }));
    } else {
      const balanceRows = await listOtOffsetBalancesByPayrollGroup({
        payrollGroup: otPayrollGroup,
        roster,
        otEligibleTypes: otEligibleTypesForBalance,
      });
      otListRows = balanceRows.map((row) => ({
        company: row.company,
        department: row.department,
        employeeName: row.employeeName,
        metricValue: row.availableBalance,
      }));
      otListMetric = "offset_balance";
    }
  }

  const otReport =
    activeTab === "ot-summary" && otView === "detail" && otHasPeriod
      ? await buildOtSummaryReport({
          startDate: otResolvedStart,
          endDate: otResolvedEnd,
          exportBasis: otExportBasis,
          payrollGroup: otPayrollGroup,
          company: otDetailCompany || undefined,
          department: otDetailDepartment || undefined,
          employeeName: otDetailEmployee || undefined,
          employeeTypeLookup,
          hrScope: resolveOtSummaryHrScope(session, otPayrollGroup),
        })
      : null;

  const otAvailableOffsetBalance =
    activeTab === "ot-summary" &&
    otView === "detail" &&
    !otIsRf &&
    otDetailCompany &&
    otDetailDepartment &&
    otDetailEmployee
      ? await computeAvailableOtOffsetBalance(
          {
            company: otDetailCompany,
            department: otDetailDepartment,
            employeeName: otDetailEmployee,
          },
          otEligibleTypesForBalance,
        )
      : null;

  const otRfClaimedHours =
    activeTab === "ot-summary" &&
    otView === "detail" &&
    otIsRf &&
    otHasPeriod &&
    otDetailCompany &&
    otDetailDepartment &&
    otDetailEmployee
      ? await computeOtClaimedHoursForPlacement(
          {
            company: otDetailCompany,
            department: otDetailDepartment,
            employeeName: otDetailEmployee,
          },
          otResolvedStart,
          otResolvedEnd,
          otEligibleTypesForBalance,
        )
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
          allCount={isHrRfAllCutoff ? allRequests.length : allRequestsRaw.length}
          companyCount={activeCompanies.length}
          periodId={isHrRfAllCutoff ? defaultHrAllPeriod || undefined : undefined}
        />
      )}

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6">
        <FlashMessage success={params.success} error={params.error} />

        <HrSlipEditModal
          open={showHrEditModal}
          cancelHref={hrPanelHref}
          request={showHrEditModal ? editingRequest! : null}
          employeeType={editingEmployeeType}
          returnTab={typeof hrListTab === "string" ? hrListTab : "pending"}
          returnPeriod={
            isPayrollOfficer && payrollOfficerTab === "rf"
              ? defaultRfPeriod
              : isHrRfAllCutoff && (activeTab as HrTab) === "all"
                ? defaultHrAllPeriod
                : undefined
          }
        />

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
              grouped
              collapseStorageKey="hr:po:confi:pending"
              editableRefIds={editablePendingRefIds}
              getEditHref={getHrEditHref}
              enableBatchCheck
              batchReturnTab="confi-pending"
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
              grouped
              collapseStorageKey="hr:po:confi:checked"
              editableRefIds={editableCheckedRefIds}
              getEditHref={getHrEditHref}
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
              grouped
              collapseStorageKey="hr:po:confi:all"
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
              grouped={session.hrScope === "Confi only" || session.hrScope === "R&F only"}
              collapseStorageKey={`hr:${session.hrScope ?? "all"}:pending`}
              editableRefIds={editablePendingRefIds}
              getEditHref={getHrEditHref}
              enableBatchCheck
              batchReturnTab={typeof hrListTab === "string" ? hrListTab : "pending"}
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
              grouped={session.hrScope === "Confi only" || session.hrScope === "R&F only"}
              collapseStorageKey={`hr:${session.hrScope ?? "all"}:checked`}
              editableRefIds={editableCheckedRefIds}
              getEditHref={getHrEditHref}
              emptyMessage="No checked records yet."
            />
          </section>
        )}

        {!isPayrollOfficer && activeTab === "all" && (
          <section className="space-y-4">
            {isHrRfAllCutoff && hrAllPeriodOptions.length > 0 && defaultHrAllPeriod ? (
              <HrAllRecordsCutoffBar
                periodOptions={hrAllPeriodOptions}
                selectedPeriodId={defaultHrAllPeriod}
                selectedPeriodLabel={selectedHrAllPeriodLabel}
                filteredCount={allRequests.length}
                exportHref={hrAllExportHref}
              />
            ) : (
              allRequests.length > 0 && (
                <div className="flex justify-end">
                  <a
                    href="/api/export/csv"
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Download CSV for Payroll
                  </a>
                </div>
              )
            )}
            <HrRecordsList
              requests={allRequests}
              employeeTypeLookup={employeeTypeLookup}
              mode="all"
              emptyMessage={
                isHrRfAllCutoff
                  ? "No records in the selected cutoff period."
                  : "No records to display."
              }
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
            listRows={otListRows}
            listMetric={otListMetric}
            listPeriodLabel={otListPeriodLabel}
            lastClosedPeriodId={otLastClosedPeriod?.id ?? null}
            report={otReport}
            availableOtOffsetBalance={otAvailableOffsetBalance}
            rfClaimedHours={otRfClaimedHours}
            view={otView}
            showAll={otShowAll}
            filters={{
              payrollGroup: otPayrollGroup,
              periodId: otPeriodId,
              startDate: otStartDate,
              endDate: otEndDate,
              useCustomRange: otUseCustomRange,
              exportBasis: otExportBasis,
              company: otDetailCompany,
              department: otDetailDepartment,
              employeeName: otDetailEmployee,
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
