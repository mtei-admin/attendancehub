import type { AttendanceRequest } from "./schema";
import { findActiveManagerByName } from "./users";

/**
 * Legacy allowlist (e.g. Bruce). Prefer Manager-account detection for new submissions.
 * Kept so older slips without submittedBy still classify as Confi.
 */
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

/**
 * Employee-portal (and similar) submit: manager own slips skip Verifier/Manager
 * and go straight to HR Confi pending — same path as Manager → File.
 */
export async function shouldDirectHrConfiOwnSlipOnSubmit(
  employeeName: string,
  options?: {
    submittedBy?: string | null;
    company?: string | null;
    department?: string | null;
  },
): Promise<boolean> {
  const name = employeeName.trim();
  if (!name) return false;

  const filer = options?.submittedBy?.trim();
  if (filer && normalizePersonName(filer) !== normalizePersonName(name)) {
    return false;
  }

  if (isDirectHrConfiOwnEmployeeName(name)) {
    return true;
  }

  const manager = await findActiveManagerByName(name, {
    company: options?.company,
    department: options?.department,
  });

  return Boolean(manager);
}
