import type { SessionUser } from "./auth";
import type { Role } from "./constants";
import type { AttendanceRequest } from "./schema";
import { isDateInPeriod } from "./cutoff";
import { requestEmployeeKey } from "./roster";

export type HrPortalListMode = "pending" | "checked" | "all";

export type PayrollOfficerConfiView = "pending" | "checked" | "all";

export type PayrollOfficerTab =
  | "rf"
  | "confi-pending"
  | "confi-checked"
  | "confi-all"
  | "employees"
  | "managers"
  | "verifiers"
  | "companies"
  | "ot-summary"
  | "record-logs";

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

export function resolvePayrollOfficerTab(tab?: string): PayrollOfficerTab {
  if (tab === "pending") return "confi-pending";
  if (tab === "checked") return "confi-checked";
  if (tab === "all") return "confi-all";

  if (
    tab === "rf" ||
    tab === "confi-pending" ||
    tab === "confi-checked" ||
    tab === "confi-all" ||
    tab === "employees" ||
    tab === "managers" ||
    tab === "verifiers" ||
    tab === "companies" ||
    tab === "ot-summary" ||
    tab === "record-logs"
  ) {
    return tab;
  }

  return "confi-pending";
}

export function payrollOfficerConfiView(tab: PayrollOfficerTab): PayrollOfficerConfiView | null {
  if (tab === "confi-pending") return "pending";
  if (tab === "confi-checked") return "checked";
  if (tab === "confi-all") return "all";
  return null;
}

export function isPayrollOfficerConfiTab(tab: PayrollOfficerTab): boolean {
  return tab === "confi-pending" || tab === "confi-checked" || tab === "confi-all";
}

export function filterPayrollOfficerConfiRequests(
  requests: AttendanceRequest[],
  employeeTypeLookup: Record<string, string>,
  view: PayrollOfficerConfiView,
): AttendanceRequest[] {
  return requests.filter((request) => {
    const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
    if (employeeType !== "Confi") return false;

    if (view === "pending") {
      return !request.archived;
    }

    if (view === "checked") {
      return request.archived;
    }

    return true;
  });
}

export function filterPayrollOfficerRfRequests(
  requests: AttendanceRequest[],
  employeeTypeLookup: Record<string, string>,
  startDate: string,
  endDate: string,
): AttendanceRequest[] {
  return requests.filter((request) => {
    if (!request.archived || request.payrollConfirmedPeriodId) {
      return false;
    }

    const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
    if (employeeType !== "Rank & File") {
      return false;
    }

    const incident = String(request.dateOfIncident);
    return isDateInPeriod(incident, startDate, endDate);
  });
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

  return filterPayrollOfficerConfiRequests(requests, employeeTypeLookup, mode);
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

export function payrollOfficerPendingTab(session: SessionUser): string {
  return session.role === "Payroll Officer" ? "confi-pending" : "pending";
}

export function payrollOfficerCheckedTab(session: SessionUser): string {
  return session.role === "Payroll Officer" ? "confi-checked" : "checked";
}
