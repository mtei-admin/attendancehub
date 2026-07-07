import { FlashMessage } from "@/components/flash-message";
import { VerificationEditModal } from "@/components/verification-edit-modal";
import { VerificationPendingList } from "@/components/verification-pending-list";
import { VerificationTabs } from "@/components/verification-tabs";
import { VerificationVerifiedList } from "@/components/verification-verified-list";
import { getSession } from "@/lib/auth";
import { listCompanies } from "@/lib/companies";
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
  }>;
};

export default async function VerificationPage({ searchParams }: VerificationPageProps) {
  const params = await searchParams;
  const activeTab = params.tab === "verified" ? "verified" : "pending";

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

  const panelHref = `/verification?tab=${activeTab}`;
  const editRefId = params.edit?.trim();

  const [unverifiedRequests, verifiedRequests, roster, companies] = await Promise.all([
    getUnverifiedPendingRequests(scope),
    getVerifiedPendingRequests(scope),
    listEmployees(true),
    listCompanies(),
  ]);

  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);
  const companyNames = companies.filter((row) => row.isActive).map((row) => row.name);

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
      />

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="py-2">
          <FlashMessage success={params.success} error={params.error} />
        </div>

        {activeTab === "pending" ? (
          <VerificationPendingList
            requests={unverifiedRequests}
            employeeTypeLookup={employeeTypeLookup}
            verifierFullName={session.fullName}
            panelHref={panelHref}
            editRefId={editRefId}
          />
        ) : (
          <VerificationVerifiedList
            requests={verifiedRequests}
            employeeTypeLookup={employeeTypeLookup}
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
