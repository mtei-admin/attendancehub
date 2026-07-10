import type { AttendanceRequest } from "@/lib/schema";

export type AdminDashboardView =
  | "employees"
  | "pending-verification"
  | "pending-manager"
  | "pending-hr"
  | "all-requests";

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

export type GroupedSlipSummary = {
  refId: string;
  requestType: string;
  dateOfIncident: string;
  workflowLabel: string;
  submittedLabel: string;
};

export type GroupedEmployeeSlips = {
  employeeName: string;
  slips: GroupedSlipSummary[];
};

export type GroupedDepartmentSlips = {
  department: string;
  employees: GroupedEmployeeSlips[];
};

export type GroupedCompanySlips = {
  company: string;
  departments: GroupedDepartmentSlips[];
};

export type GroupedEmployeeRequests = {
  employeeName: string;
  requests: AttendanceRequest[];
};

export type GroupedDepartmentRequests = {
  department: string;
  employees: GroupedEmployeeRequests[];
};

export type GroupedCompanyRequests = {
  company: string;
  departments: GroupedDepartmentRequests[];
};

export type GroupedEmployeeRoster = {
  employeeName: string;
  employeeType: string;
};

export type GroupedDepartmentRoster = {
  department: string;
  employees: GroupedEmployeeRoster[];
};

export type GroupedCompanyRoster = {
  company: string;
  departments: GroupedDepartmentRoster[];
};

function departmentLabel(request: AttendanceRequest): string {
  const company = request.company?.trim();
  const department = request.department?.trim() || "Unassigned";

  if (!company) {
    return department;
  }

  return `${company} · ${department}`;
}

export function slipWorkflowLabel(request: AttendanceRequest): string {
  if (request.archived) return "Checked";
  if (request.status === "Approved") return "HR pending";
  if (request.status === "Rejected") return "Rejected";
  if (request.verifiedOn) return "Manager pending";
  return "Verification pending";
}

function formatSubmittedDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function filterRequestsForDashboardView(
  requests: AttendanceRequest[],
  view: AdminDashboardView,
): AttendanceRequest[] {
  switch (view) {
    case "pending-verification":
      return requests.filter((row) => row.status === "Pending" && !row.verifiedOn);
    case "pending-manager":
      return requests.filter((row) => row.status === "Pending" && Boolean(row.verifiedOn));
    case "pending-hr":
      return requests.filter((row) => row.status === "Approved" && !row.archived);
    case "all-requests":
      return requests;
    default:
      return [];
  }
}

export function groupRequestsByPlacement(
  requests: AttendanceRequest[],
): GroupedCompanySlips[] {
  const companyMap = new Map<string, Map<string, Map<string, AttendanceRequest[]>>>();

  for (const request of requests) {
    const company = request.company?.trim() || "Unassigned";
    const department = request.department?.trim() || "Unassigned";
    const employeeName = request.employeeName;

    if (!companyMap.has(company)) companyMap.set(company, new Map());
    const departmentMap = companyMap.get(company)!;
    if (!departmentMap.has(department)) departmentMap.set(department, new Map());
    const employeeMap = departmentMap.get(department)!;
    if (!employeeMap.has(employeeName)) employeeMap.set(employeeName, []);
    employeeMap.get(employeeName)!.push(request);
  }

  return Array.from(companyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([company, departmentMap]) => ({
      company,
      departments: Array.from(departmentMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([department, employeeMap]) => ({
          department,
          employees: Array.from(employeeMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([employeeName, slips]) => ({
              employeeName,
              slips: slips
                .sort(
                  (a, b) =>
                    (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0),
                )
                .map((slip) => ({
                  refId: slip.refId,
                  requestType: slip.requestType,
                  dateOfIncident: slip.dateOfIncident,
                  workflowLabel: slipWorkflowLabel(slip),
                  submittedLabel: formatSubmittedDate(slip.submittedAt),
                })),
            })),
        })),
    }));
}

export function groupAttendanceRequestsByPlacement(
  requests: AttendanceRequest[],
): GroupedCompanyRequests[] {
  const companyMap = new Map<string, Map<string, Map<string, AttendanceRequest[]>>>();

  for (const request of requests) {
    const company = request.company?.trim() || "Unassigned";
    const department = request.department?.trim() || "Unassigned";
    const employeeName = request.employeeName;

    if (!companyMap.has(company)) companyMap.set(company, new Map());
    const departmentMap = companyMap.get(company)!;
    if (!departmentMap.has(department)) departmentMap.set(department, new Map());
    const employeeMap = departmentMap.get(department)!;
    if (!employeeMap.has(employeeName)) employeeMap.set(employeeName, []);
    employeeMap.get(employeeName)!.push(request);
  }

  return Array.from(companyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([company, departmentMap]) => ({
      company,
      departments: Array.from(departmentMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([department, employeeMap]) => ({
          department,
          employees: Array.from(employeeMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([employeeName, employeeRequests]) => ({
              employeeName,
              requests: employeeRequests.sort(
                (a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0),
              ),
            })),
        })),
    }));
}

export function groupActiveEmployeesByPlacement(
  employees: {
    companyName: string;
    departmentName: string;
    fullName: string;
    employeeType: string;
    isActive: boolean;
  }[],
): GroupedCompanyRoster[] {
  const companyMap = new Map<string, Map<string, GroupedEmployeeRoster[]>>();

  for (const employee of employees.filter((row) => row.isActive)) {
    if (!companyMap.has(employee.companyName)) companyMap.set(employee.companyName, new Map());
    const departmentMap = companyMap.get(employee.companyName)!;
    if (!departmentMap.has(employee.departmentName)) departmentMap.set(employee.departmentName, []);
    departmentMap.get(employee.departmentName)!.push({
      employeeName: employee.fullName,
      employeeType: employee.employeeType,
    });
  }

  return Array.from(companyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([company, departmentMap]) => ({
      company,
      departments: Array.from(departmentMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([department, roster]) => ({
          department,
          employees: roster.sort((a, b) => a.employeeName.localeCompare(b.employeeName)),
        })),
    }));
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
    pendingManagerApproval: requests.filter(
      (row) => row.status === "Pending" && Boolean(row.verifiedOn),
    ).length,
    pendingHrProcessing: requests.filter(
      (row) => row.status === "Approved" && !row.archived,
    ).length,
    totalRequests: requests.length,
    byDepartment: Array.from(byDepartment.values()).sort((a, b) =>
      a.department.localeCompare(b.department),
    ),
  };
}
