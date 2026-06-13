import { EmployeeForm } from "@/components/employee-form";
import { FlashMessage } from "@/components/flash-message";
import { listDepartments } from "@/lib/departments";
import { getEmployeesByDepartment } from "@/lib/roster";

type EmployeePageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const [departments, employeesByDepartment] = await Promise.all([
    listDepartments(true),
    getEmployeesByDepartment(),
  ]);

  return (
    <div className="space-y-4">
      <FlashMessage success={params.success} error={params.error} />
      <EmployeeForm
        departments={departments.map((row) => ({ id: row.id, name: row.name }))}
        employeesByDepartment={employeesByDepartment}
      />
    </div>
  );
}
