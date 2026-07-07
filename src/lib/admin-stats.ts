import type { AttendanceRequest } from "@/lib/schema";

export type DepartmentRequestStats = {
  department: string;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type AdminDashboardStats = {
  totalEmployees: number;
  pendingVerification: number;
  pendingManagerApproval: number;
  pendingHrProcessing: number;
  totalRequests: number;
  byDepartment: DepartmentRequestStats[];
};

function departmentLabel(request: AttendanceRequest): string {
  const company = request.company?.trim();
  const department = request.department?.trim() || "Unassigned";

  if (!company) {
    return department;
  }

  return `${company} · ${department}`;
}

export function buildAdminDashboardStats(
  requests: AttendanceRequest[],
  totalEmployees: number,
): AdminDashboardStats {
  const byDepartment = new Map<string, DepartmentRequestStats>();

  for (const request of requests) {
    const department = departmentLabel(request);
    const existing = byDepartment.get(department) ?? {
      department,
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    existing.total += 1;
    if (request.status === "Pending") existing.pending += 1;
    if (request.status === "Approved") existing.approved += 1;
    if (request.status === "Rejected") existing.rejected += 1;

    byDepartment.set(department, existing);
  }

  return {
    totalEmployees,
    pendingVerification: requests.filter(
      (row) => row.status === "Pending" && !row.verifiedOn,
    ).length,
    pendingManagerApproval: requests.filter((row) => row.status === "Pending").length,
    pendingHrProcessing: requests.filter(
      (row) => row.status === "Approved" && !row.archived,
    ).length,
    totalRequests: requests.length,
    byDepartment: Array.from(byDepartment.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    ),
  };
}
