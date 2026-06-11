import { FlashMessage } from "@/components/flash-message";
import { EmployeeForm } from "@/components/employee-form";

type EmployeePageProps = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Submit Attendance Request</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fill out the form below to log a late arrival, absence, leave, or offset request.
        </p>
      </div>

      <FlashMessage success={params.success} error={params.error} />
      <EmployeeForm />
    </div>
  );
}
