export const ROLES = ["Employee", "Manager", "HR", "Admin"] as const;
export type Role = (typeof ROLES)[number];

export const HR_SCOPES = ["R&F only", "Confi only"] as const;
export type HrScope = (typeof HR_SCOPES)[number];

export const REQUEST_TYPES = ["Late", "Absent", "Leave", "Offset"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type RequestStatus = (typeof STATUSES)[number];

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
  HR: "/hr",
  Admin: "/admin",
};

export const PORTAL_SLUGS = ["employee", "manager", "hr", "admin"] as const;
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
  hr: {
    title: "HR portal",
    subtitle: "Sign in to process approved records for payroll.",
    description: "Process approved records for payroll",
    icon: "📊",
    accent: "border-emerald-200 bg-emerald-50 text-emerald-600",
  },
  admin: {
    title: "IT / Admin portal",
    subtitle: "Sign in to manage accounts, roster, and system settings.",
    description: "Manage accounts, roster & system",
    icon: "⚙️",
    accent: "border-pink-200 bg-pink-50 text-pink-600",
  },
};
