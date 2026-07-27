import { FlashMessage } from "@/components/flash-message";
import { IncludeArchivedPeriodsToggle } from "@/components/include-archived-periods-toggle";
import { VerificationEditModal } from "@/components/verification-edit-modal";
import { VerificationPendingList } from "@/components/verification-pending-list";
import { VerificationTabs } from "@/components/verification-tabs";
import { VerificationVerifiedList } from "@/components/verification-verified-list";
import { getSession } from "@/lib/auth";
import {
  buildCutoffRulesByEmployeeType,
  filterRequestsExcludingArchivedCutoffPeriods,
  listArchivedCutoffPeriodKeys,
} from "@/lib/archived-cutoff-periods";
import { listCompanies } from "@/lib/companies";
import { getCurrentCutoffPeriod } from "@/lib/cutoff";
import { filterRequestsForManagerRange } from "@/lib/manager-grouping";
import { listPayrollCutoffRules } from "@/lib/ot-settings";
import {
  getRequestByRefId,
  getUnverifiedPendingRequests,
  getVerifiedPendingRequests,
} from "@/lib/requests";
import {
  buildEmployeeTypeLookup,
  buildEmployeesByCompanyDepartment,
  listEmployees,
} from "@/lib/roster";
import { buildVerifierScope } from "@/lib/verification";
import { redirect } from "next/navigation";

type VerificationPageProps = {
  searchParams: Promise<{
    tab?: string;
    edit?: string;
    success?: string;
    error?: string;
    include_archived_periods?: string;
  }>;
};

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "verified" ? "verified" : "pending";
  const includeArchivedPeriods = params.include_archived_periods === "1";

  const session = await getSession();
  if (!session || session.role !== "Verifier") {
    redirect("/");
  }

  const scope = buildVerifierScope(session.company, session.department);
  if (!scope) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-600">
        Your verifier account has no company assigned. Contact HR or Admin.
      </div>
    );
  }

  const panelHref = includeArchivedPeriods
    ? `/verification?tab=${activeTab}&include_archived_periods=1`
    : `/verification?tab=${activeTab}`;
  const editRefId = params.edit?.trim();

  const [unverifiedRaw, verifiedRaw, roster, companies, cutoffRules, archivedPeriodKeys] =
    await Promise.all([
      getUnverifiedPendingRequests(scope),
      getVerifiedPendingRequests(scope),
      listEmployees(true),
      listCompanies(),
      listPayrollCutoffRules(),
      listArchivedCutoffPeriodKeys(),
    ]);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);
  const companyNames = companies.filter((row) => row.isActive).map((row) => row.name);
  const cutoffRulesByEmployeeType = buildCutoffRulesByEmployeeType(cutoffRules);

  const unverifiedVisible = filterRequestsExcludingArchivedCutoffPeriods(unverifiedRaw, {
    includeArchivedPeriods,
    employeeTypeLookup,
    cutoffRulesByEmployeeType,
    archivedPeriodKeys,
  });
  const verifiedRequests = filterRequestsExcludingArchivedCutoffPeriods(verifiedRaw, {
    includeArchivedPeriods,
    employeeTypeLookup,
    cutoffRulesByEmployeeType,
    archivedPeriodKeys,
  });

  // Pending verification: current cutoff only (per employee payroll group).
  const unverifiedRequests = filterRequestsForManagerRange(
    unverifiedVisible,
    "current",
    cutoffRules,
    employeeTypeLookup,
  );

  const currentCutoffLabels = cutoffRules
    .map((rule) => {
      const period = getCurrentCutoffPeriod(rule);
      return period ? `${rule.employeeType}: ${period.label}` : null;
    })
    .filter((label): label is string => Boolean(label));

  const editingRequest = editRefId ? await getRequestByRefId(editRefId) : undefined;
  const showEditModal = Boolean(
    editingRequest &&
      editingRequest.status === "Pending" &&
      !editingRequest.verifiedOn &&
      editingRequest.company === scope.company &&
      (!scope.department || editingRequest.department === scope.department),
  );

  return (
    <>
      <VerificationTabs
        activeTab={activeTab}
        pendingCount={unverifiedRequests.length}
        verifiedCount={verifiedRequests.length}
        includeArchivedPeriods={includeArchivedPeriods}
      />

      <div className="mx-auto max-w-6xl space-y-3 px-4 md:px-6">
        <div className="py-2">
          <FlashMessage success={params.success} error={params.error} />
        </div>

        <IncludeArchivedPeriodsToggle
          baseHref={`/verification?tab=${activeTab}`}
          includeArchivedPeriods={includeArchivedPeriods}
        />

        {activeTab === "pending" ? (
          <VerificationPendingList
            requests={unverifiedRequests}
            employeeTypeLookup={employeeTypeLookup}
            verifierFullName={session.fullName}
            panelHref={panelHref}
            editRefId={editRefId}
            currentCutoffLabels={currentCutoffLabels}
          />
        ) : (
          <VerificationVerifiedList
            requests={verifiedRequests}
            employeeTypeLookup={employeeTypeLookup}
            cutoffRules={cutoffRules}
          />
        )}
      </div>

      <VerificationEditModal
        open={showEditModal}
        cancelHref={panelHref}
        request={editingRequest ?? null}
        verifierFullName={session.fullName}
        companies={companyNames}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
        scopeCompany={scope.company}
        scopeDepartment={scope.department}
      />
    </>
  );
}
