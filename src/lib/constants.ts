export const ROLES = ["Employee", "Manager", "Verifier", "HR", "Payroll Officer", "Admin"] as const;
export type Role = (typeof ROLES)[number];

export const ALL_DEPARTMENTS_VALUE = "__ALL_DEPARTMENTS__";
export const ALL_DEPARTMENTS_LABEL = "All Departments";

export function normalizeManagerDepartment(department: string | null | undefined): string | null {
  if (!department || department === ALL_DEPARTMENTS_VALUE) {
    return null;
  }
  return department;
}

export function managerDepartmentFieldDefault(
  department: string | null | undefined,
  isEditing: boolean,
): string {
  if (!isEditing) return "";
  return department ?? ALL_DEPARTMENTS_VALUE;
}

export const HR_SCOPES = ["R&F only", "Confi only"] as const;
export type HrScope = (typeof HR_SCOPES)[number];

export const EMPLOYEE_TYPES = ["Rank & File", "Confi"] as const;
export type EmployeeType = (typeof EMPLOYEE_TYPES)[number];

export const REQUEST_TYPES = [
  "Late/Undertime",
  "Absent/Leave",
  "Early/Overbreak",
  "Overtime",
  "Holiday/Rest Day Work",
  "OT Offset",
  "Work From Home",
  "Trip Ticket",
  "Change Shift",
] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export function needsCheckHoursOnHrCheck(requestType: string): boolean {
  return requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
}

export const STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const COMPANIES = ["MTEI", "MTE Logistics", "MTE Engineering"] as const;
export type Company = (typeof COMPANIES)[number];
export const DEFAULT_COMPANY: Company = "MTEI";

export const DEPARTMENTS = [
  "Operations",
  "Human Resource",
  "Sales & Marketing",
  "Logistics",
  "Engineering",
  "Finance",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const EMPLOYEES_BY_DEPARTMENT: Record<Department, readonly string[]> = {
  Operations: ["Maria Santos", "Juan Dela Cruz", "Pedro Garcia"],
  "Human Resource": ["Ana Reyes", "Lisa Fernandez"],
  "Sales & Marketing": ["Mark Villanueva"],
  Logistics: ["Ryan Ocampo"],
  Engineering: [],
  Finance: ["Grace Tan"],
};

export const EMPLOYEE_NAMES = [
  "Maria Santos",
  "Juan Dela Cruz",
  "Ana Reyes",
  "Pedro Garcia",
  "Lisa Fernandez",
  "Mark Villanueva",
  "Grace Tan",
  "Ryan Ocampo",
] as const;

export const MANAGER_NAME = "Carlos Reyes";

/** Demo display name until auth is implemented */
export const MANAGER_PORTAL_USER = "Ana Reyes";

export const ROLE_ROUTES: Record<Role, string> = {
  Employee: "/employee",
  Manager: "/manager",
  Verifier: "/verification",
  HR: "/hr",
  "Payroll Officer": "/hr",
  Admin: "/admin",
};

export const PORTAL_SLUGS = [
  "employee",
  "verification",
  "manager",
  "hr",
  "payroll",
  "admin",
] as const;
export type PortalSlug = (typeof PORTAL_SLUGS)[number];

export function isPortalSlug(value: string): value is PortalSlug {
  return (PORTAL_SLUGS as readonly string[]).includes(value);
}

export const PORTAL_CONFIG: Record<
  PortalSlug,
  { title: string; subtitle: string; description: string; icon: string; accent: string }
> = {
  employee: {
    title: "Employee portal",
    subtitle: "File attendance or leave requests.",
    description: "File an attendance or leave request",
    icon: "👤",
    accent: "border-violet-200 bg-violet-50 text-violet-600",
  },
  manager: {
    title: "Manager portal",
    subtitle: "Sign in to review your team's requests.",
    description: "Review and approve team requests",
    icon: "📋",
    accent: "border-orange-200 bg-orange-50 text-orange-600",
  },
  verification: {
    title: "Verification portal",
    subtitle: "Sign in to review and verify attendance requests.",
    description: "Review and verify requests before approval",
    icon: "✅",
    accent: "border-cyan-200 bg-cyan-50 text-cyan-600",
  },
  hr: {
    title: "HR portal",
    subtitle: "Sign in to process approved records for payroll.",
    description: "Process approved records for payroll",
    icon: "📊",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  payroll: {
    title: "Payroll Officer portal",
    subtitle: "Sign in for Confi HR processing and R&F checked records.",
    description: "Confi processing and R&F checked export",
    icon: "💼",
    accent: "border-sky-200 bg-sky-50 text-sky-600",
  },
  admin: {
    title: "IT / Admin portal",
    subtitle: "Sign in to manage accounts, roster, and system settings.",
    description: "Manage accounts, roster & system",
    icon: "⚙️",
    accent: "border-pink-200 bg-pink-50 text-pink-600",
  },
};
