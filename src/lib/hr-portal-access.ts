import type { SessionUser } from "./auth";
import type { Role } from "./constants";
import type { AttendanceRequest } from "./schema";
import { requestEmployeeKey } from "./roster";

export type HrPortalListMode = "pending" | "checked" | "all";

export const HR_PORTAL_ROLES: Role[] = ["HR", "Payroll Officer"];

export function canAccessHrPortal(role: Role): boolean {
  return HR_PORTAL_ROLES.includes(role);
}

export function isPayrollOfficerRole(role: Role): boolean {
  return role === "Payroll Officer";
}

export function hrPortalTitle(session: SessionUser): string {
  if (session.role === "Payroll Officer") {
    return "Payroll Officer portal";
  }

  const scope = session.hrScope === "Confi only"
    ? "Confi"
    : session.hrScope === "R&F only"
      ? "R&F"
      : "";

  return scope ? `HR portal — ${scope}` : "HR portal";
}

export function filterRequestsForHrPortal(
  requests: AttendanceRequest[],
  employeeTypeLookup: Record<string, string>,
  session: SessionUser,
  mode: HrPortalListMode,
): AttendanceRequest[] {
  if (session.role === "HR") {
    return filterHrScopedRequests(requests, employeeTypeLookup, session.hrScope);
  }

  if (session.role !== "Payroll Officer") {
    return [];
  }

  return requests.filter((request) => {
    const employeeType = employeeTypeLookup[requestEmployeeKey(request)];

    if (mode === "pending") {
      return employeeType === "Confi";
    }

    if (mode === "checked") {
      return (
        request.archived &&
        (employeeType === "Rank & File" || employeeType === "Confi")
      );
    }

    return employeeType === "Confi";
  });
}

function filterHrScopedRequests(
  requests: AttendanceRequest[],
  employeeTypeLookup: Record<string, string>,
  hrScope: string | null,
): AttendanceRequest[] {
  if (!hrScope) return requests;

  const allowedType =
    hrScope === "R&F only" ? "Rank & File" : hrScope === "Confi only" ? "Confi" : null;

  if (!allowedType) return requests;

  return requests.filter((request) => {
    const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
    return employeeType === allowedType;
  });
}

export function canHrCheckRequest(session: SessionUser, employeeType?: string): boolean {
  if (session.role === "HR") {
    return true;
  }

  if (session.role === "Payroll Officer") {
    return employeeType === "Confi";
  }

  return false;
}

export function resolveOtSummaryHrScope(
  session: SessionUser,
  payrollGroup: string,
): string | null {
  if (session.role === "HR") {
    return session.hrScope;
  }

  if (session.role === "Payroll Officer") {
    return payrollGroup === "Confi" ? "Confi only" : "R&F only";
  }

  return null;
}

export function canUseOtExportBasis(
  session: SessionUser,
  payrollGroup: string,
  exportBasis: "approved" | "checked",
): boolean {
  if (session.role === "Payroll Officer" && payrollGroup === "Rank & File") {
    return exportBasis === "checked";
  }

  return true;
}
