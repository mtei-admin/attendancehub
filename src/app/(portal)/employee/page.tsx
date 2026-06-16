import { EmployeeForm } from "@/components/employee-form";
import { FlashMessage } from "@/components/flash-message";
import { listCompanyNames } from "@/lib/companies";
import { getEmployeesByCompanyDepartment } from "@/lib/roster";

type EmployeePageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const [companies, employeesByCompanyDepartment] = await Promise.all([
    listCompanyNames(true),
    getEmployeesByCompanyDepartment(),
  ]);

  return (
    <div className="space-y-4">
      <FlashMessage success={params.success} error={params.error} />
      <EmployeeForm
        companies={companies}
        employeesByCompanyDepartment={employeesByCompanyDepartment}
      />
    </div>
  );
}
