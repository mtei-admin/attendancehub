export const ROLES = ["Employee", "Manager", "HR"] as const;
export type Role = (typeof ROLES)[number];

export const REQUEST_TYPES = ["Late", "Absent", "Leave", "Offset"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type RequestStatus = (typeof STATUSES)[number];

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

export const ROLE_ROUTES: Record<Role, string> = {
  Employee: "/employee",
  Manager: "/manager",
  HR: "/hr",
};
