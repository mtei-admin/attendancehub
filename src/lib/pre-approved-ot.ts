import type { AttendanceRequest } from "./schema";

export const PRE_APPROVED_OT_REQUEST_TYPE = "Overtime";
export const PRE_APPROVED_OT_MAX_DAYS_AHEAD = 2;

export const COMPLETION_WITHIN = "within";
export const COMPLETION_NEEDS_REAPPROVAL = "needs_reapproval";

export type CompletionOutcome =
  | typeof COMPLETION_WITHIN
  | typeof COMPLETION_NEEDS_REAPPROVAL;

/** Calendar date YYYY-MM-DD in local-ish ISO (matches existing employee form). */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Incident date must be today through today+2 (inclusive). */
export function isPreApprovedOtFilingWindow(
  incidentDate: string,
  today: string = todayIsoDate(),
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) return false;
  const latest = addDaysIso(today, PRE_APPROVED_OT_MAX_DAYS_AHEAD);
  return incidentDate >= today && incidentDate <= latest;
}

export function isPreApprovedOtRequest(request: AttendanceRequest): boolean {
  return Boolean(request.isPreApprovedOt);
}

export function isAwaitingPreApproval(request: AttendanceRequest): boolean {
  return (
    request.isPreApprovedOt &&
    request.status === "Pending" &&
    !request.preApprovedOn
  );
}

export function isAwaitingCompletionVerification(request: AttendanceRequest): boolean {
  return (
    request.isPreApprovedOt &&
    request.status === "Pending" &&
    Boolean(request.preApprovedOn) &&
    !request.completionOutcome
  );
}

export function isAwaitingReapproval(request: AttendanceRequest): boolean {
  return (
    request.isPreApprovedOt &&
    request.status === "Pending" &&
    request.completionOutcome === COMPLETION_NEEDS_REAPPROVAL
  );
}

/** Verifier may work this slip only after pre-approval and on/after incident date. */
export function isReadyForCompletionVerification(
  request: AttendanceRequest,
  today: string = todayIsoDate(),
): boolean {
  return (
    isAwaitingCompletionVerification(request) &&
    request.dateOfIncident <= today
  );
}

export function canManagerActOnPreApprovedOt(
  request: AttendanceRequest,
  actor: { userId: number; role: string },
): boolean {
  if (!request.isPreApprovedOt || request.status !== "Pending") return false;

  if (isAwaitingPreApproval(request)) {
    return actor.role === "Manager" || actor.role === "Admin";
  }

  if (isAwaitingReapproval(request)) {
    if (actor.role === "Admin") return true;
    if (actor.role !== "Manager") return false;
    // Prefer original pre-approver; other managers allowed when away.
    return true;
  }

  return false;
}

/** Short stage label for badges / My Records. */
export function preApprovedOtStageLabel(
  request: AttendanceRequest,
): string | null {
  if (!request.isPreApprovedOt) return null;
  if (request.status === "Rejected") return "Pre-approved OT (rejected)";
  if (request.status === "Approved") {
    return request.completionOutcome === COMPLETION_NEEDS_REAPPROVAL
      ? "Pre-approved OT (re-approved)"
      : "Pre-approved OT";
  }
  if (isAwaitingPreApproval(request)) return "Awaiting pre-approval";
  if (isAwaitingReapproval(request)) return "Re-approval needed";
  if (isAwaitingCompletionVerification(request)) {
    return "Waiting for work / verifier";
  }
  return "Pre-approved OT";
}

export function isPreferredPreApprover(
  request: AttendanceRequest,
  actorUserId: number,
): boolean {
  return (
    Boolean(request.preApprovedByUserId) &&
    request.preApprovedByUserId === actorUserId
  );
}

export function preApprovedOtFilingError(
  requestType: string,
  incidentDate: string,
  today: string = todayIsoDate(),
): string | null {
  if (requestType !== PRE_APPROVED_OT_REQUEST_TYPE) {
    return "Pre-approved OT is only available for Overtime.";
  }
  if (!isPreApprovedOtFilingWindow(incidentDate, today)) {
    return `Pre-approved OT can only be filed for today through ${addDaysIso(today, PRE_APPROVED_OT_MAX_DAYS_AHEAD)} (max ${PRE_APPROVED_OT_MAX_DAYS_AHEAD} days ahead).`;
  }
  return null;
}
