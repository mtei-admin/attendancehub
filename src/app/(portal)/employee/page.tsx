import { EmployeeForm } from "@/components/employee-form";
import { EmployeeTabs, type EmployeeSection } from "@/components/employee-tabs";
import { FlashMessage } from "@/components/flash-message";
import { MyRecordsSection } from "@/components/my-records-section";
import { listCompanyNames } from "@/lib/companies";
import { isSmtpConfigured } from "@/lib/mail";
import { queryEmployeeRecords, type RecordRequestFilters } from "@/lib/record-requests";
import { parseViewedAt } from "@/lib/records-view-session";
import { computeAvailableOtOffsetBalance } from "@/lib/ot-offset-balance";
import { computeOtClaimedHoursForPlacement } from "@/lib/ot-claimed";
import { getLastClosedCutoffPeriod, getEarliestAllowedIncidentDate } from "@/lib/cutoff";
import { getActiveOtEligibleTypes, getPayrollCutoffRule, listPayrollCutoffRules } from "@/lib/ot-settings";
import {
  buildEmployeeEmailLookup,
  buildEmployeeTypeLookup,
  buildEmployeesByCompanyDepartment,
  getEmployeeByPlacement,
  listEmployees,
} from "@/lib/roster";

type EmployeePageProps = {
  searchParams: Promise<{
    section?: string;
    view?: string;
    company?: string;
    department?: string;
    employee_name?: string;
    submitted_from?: string;
    submitted_to?: string;
    request_type?: string;
    status?: string;
    viewed_at?: string;
    edit?: string;
    success?: string;
    error?: string;
  }>;
};

export const maxDuration = 60;

function resolveSection(section?: string): EmployeeSection {
  return section === "records" ? "records" : "file";
}

function parseActiveRecordView(params: {
  view?: string;
  company?: string;
  department?: string;
  employee_name?: string;
  submitted_from?: string;
  submitted_to?: string;
  request_type?: string;
  status?: string;
  viewed_at?: string;
}): { filters: RecordRequestFilters; viewedAt: number } | undefined {
  if (params.view !== "1") return undefined;

  const company = params.company?.trim() ?? "";
  const department = params.department?.trim() ?? "";
  const employeeName = params.employee_name?.trim() ?? "";
  const submittedFrom = params.submitted_from?.trim() ?? "";
  const submittedTo = params.submitted_to?.trim() ?? "";
  const viewedAt = parseViewedAt(params.viewed_at);

  if (!company || !department || !employeeName || !submittedFrom || !submittedTo || !viewedAt) {
    return undefined;
  }

  return {
    viewedAt,
    filters: {
      company,
      department,
      employeeName,
      submittedFrom,
      submittedTo,
      requestType: params.request_type?.trim() || undefined,
      status: params.status?.trim() || undefined,
    },
  };
}

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const activeSection = resolveSection(params.section);
  const activeRecordView = parseActiveRecordView(params);

  const [companies, roster, viewedRecords, otEligibleTypes, selectedEmployee, cutoffRules] =
    await Promise.all([
      listCompanyNames(true),
      listEmployees(true),
      activeRecordView ? queryEmployeeRecords(activeRecordView.filters) : Promise.resolve([]),
      getActiveOtEligibleTypes(),
      activeRecordView
        ? getEmployeeByPlacement(
            activeRecordView.filters.company,
            activeRecordView.filters.department,
            activeRecordView.filters.employeeName,
          )
        : Promise.resolve(null),
      listPayrollCutoffRules(),
    ]);

  const cutoffMinByEmployeeType: Record<string, string> = {};
  for (const rule of cutoffRules) {
    const earliest = getEarliestAllowedIncidentDate(rule);
    if (earliest) {
      cutoffMinByEmployeeType[rule.employeeType] = earliest;
    }
  }

  const availableOtOffsetBalance =
    selectedEmployee?.employeeType === "Confi" && activeRecordView
      ? await computeAvailableOtOffsetBalance(
          {
            company: activeRecordView.filters.company,
            department: activeRecordView.filters.department,
            employeeName: activeRecordView.filters.employeeName,
          },
          otEligibleTypes,
        )
      : null;

  let otClaimedThisCutoff: number | null = null;
  let otClaimedCutoffLabel: string | null = null;
  if (selectedEmployee?.employeeType === "Rank & File" && activeRecordView) {
    const rfCutoffRule = await getPayrollCutoffRule("Rank & File");
    const lastClosed = rfCutoffRule ? getLastClosedCutoffPeriod(rfCutoffRule) : null;
    if (lastClosed) {
      otClaimedCutoffLabel = lastClosed.label;
      otClaimedThisCutoff = await computeOtClaimedHoursForPlacement(
        {
          company: activeRecordView.filters.company,
          department: activeRecordView.filters.department,
          employeeName: activeRecordView.filters.employeeName,
        },
        lastClosed.startDate,
        lastClosed.endDate,
        otEligibleTypes,
      );
    } else {
      otClaimedThisCutoff = 0;
    }
  }

  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const employeeEmails = buildEmployeeEmailLookup(roster);

  return (
    <div className="space-y-4">
      <FlashMessage success={params.success} error={params.error} />

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
        <EmployeeTabs activeSection={activeSection} />

        {activeSection === "file" ? (
          <EmployeeForm
            companies={companies}
            employeesByCompanyDepartment={employeesByCompanyDepartment}
            employeeTypeLookup={employeeTypeLookup}
            cutoffMinByEmployeeType={cutoffMinByEmployeeType}
          />
        ) : (
          <MyRecordsSection
            companies={companies}
            employeesByCompanyDepartment={employeesByCompanyDepartment}
            employeeEmails={employeeEmails}
            smtpConfigured={isSmtpConfigured()}
            records={viewedRecords}
            activeRecordView={activeRecordView}
            editRefId={params.edit?.trim()}
            employeeType={selectedEmployee?.employeeType}
            availableOtOffsetBalance={availableOtOffsetBalance}
            otClaimedThisCutoff={otClaimedThisCutoff}
            otClaimedCutoffLabel={otClaimedCutoffLabel}
          />
        )}
      </div>
    </div>
  );
}
