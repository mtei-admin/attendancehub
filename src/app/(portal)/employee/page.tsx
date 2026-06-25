import { EmployeeForm } from "@/components/employee-form";
import { EmployeeTabs, type EmployeeSection } from "@/components/employee-tabs";
import { FlashMessage } from "@/components/flash-message";
import { RequestRecordsForm } from "@/components/request-records-form";
import { listCompanyNames } from "@/lib/companies";
import {
  buildEmployeeEmailLookup,
  buildEmployeesByCompanyDepartment,
  listEmployees,
} from "@/lib/roster";

type EmployeePageProps = {
  searchParams: Promise<{ section?: string; success?: string; error?: string }>;
};

function resolveSection(section?: string): EmployeeSection {
  return section === "records" ? "records" : "file";
}

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const activeSection = resolveSection(params.section);

  const [companies, roster] = await Promise.all([listCompanyNames(true), listEmployees(true)]);
  const employeesByCompanyDepartment = buildEmployeesByCompanyDepartment(roster);
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
          />
        ) : (
          <RequestRecordsForm
            companies={companies}
            employeesByCompanyDepartment={employeesByCompanyDepartment}
            employeeEmails={employeeEmails}
          />
        )}
      </div>
    </div>
  );
}
