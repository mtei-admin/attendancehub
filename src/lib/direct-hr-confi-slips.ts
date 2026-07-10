import type { AttendanceRequest } from "./schema";

/** Employees whose own slips skip verification/manager approval and go to HR Confi pending. */
export const DIRECT_HR_CONFI_OWN_EMPLOYEE_NAMES = [
  "BAGASBAS, BRUCE PETER MENAC",
] as const;

function normalizePersonName(name: string): string {
  return name.trim().toLowerCase();
}

export function isDirectHrConfiOwnEmployeeName(name: string): boolean {
  const normalized = normalizePersonName(name);
  return DIRECT_HR_CONFI_OWN_EMPLOYEE_NAMES.some(
    (allowed) => normalizePersonName(allowed) === normalized,
  );
}

export function isManagerSelfFiledRequest(request: AttendanceRequest): boolean {
  const submittedBy = request.submittedBy?.trim();
  if (!submittedBy) return false;

  return normalizePersonName(request.employeeName) === normalizePersonName(submittedBy);
}

/** Own slip that should route to HR Confi pending (manager self-file or listed employees). */
export function isDirectHrConfiOwnSlip(request: AttendanceRequest): boolean {
  if (isManagerSelfFiledRequest(request)) {
    return true;
  }

  if (!isDirectHrConfiOwnEmployeeName(request.employeeName)) {
    return false;
  }

  const submittedBy = request.submittedBy?.trim();
  if (!submittedBy) {
    return true;
  }

  return isDirectHrConfiOwnEmployeeName(submittedBy);
}

export function shouldDirectHrConfiOwnSlipOnSubmit(
  employeeName: string,
  submittedBy?: string | null,
): boolean {
  if (!isDirectHrConfiOwnEmployeeName(employeeName)) {
    return false;
  }

  const filer = submittedBy?.trim();
  if (!filer) {
    return true;
  }

  return normalizePersonName(filer) === normalizePersonName(employeeName);
}
