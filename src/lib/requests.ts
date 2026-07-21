import { and, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";

import { MANAGER_NAME } from "./constants";
import { getDb } from "./db";
import { attendanceRequests, type AttendanceRequest } from "./schema";

export type RequestScope = {
  company?: string;
  department?: string;
  /** When set, only these employee names are visible/actionable. */
  employeeNames?: string[];
};

async function generateRefId(): Promise<string> {
  const db = getDb();
  const [latest] = await db
    .select({ refId: attendanceRequests.refId })
    .from(attendanceRequests)
    .orderBy(desc(attendanceRequests.id))
    .limit(1);

  if (!latest) {
    return "REQ-001";
  }

  const lastNum = Number.parseInt(latest.refId.split("-")[1] ?? "0", 10);
  return `REQ-${String(lastNum + 1).padStart(3, "0")}`;
}

function buildScopeConditions(scope?: RequestScope) {
  if (!scope?.company && !scope?.department && !scope?.employeeNames?.length) {
    return undefined;
  }

  const parts = [];
  if (scope.company) {
    parts.push(eq(attendanceRequests.company, scope.company));
  }
  if (scope.department) {
    parts.push(eq(attendanceRequests.department, scope.department));
  }
  if (scope.employeeNames && scope.employeeNames.length > 0) {
    parts.push(inArray(attendanceRequests.employeeName, scope.employeeNames));
  }

  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : and(...parts);
}

export async function addRequest(input: {
  company: string;
  department: string;
  employeeName: string;
  requestType: string;
  dateRequested: string;
  dateOfIncident: string;
  reason: string;
  timeIn?: string | null;
  timeOut?: string | null;
  otHrs?: string | null;
}): Promise<string> {
  const db = getDb();
  const refId = await generateRefId();
  const otValue = input.otHrs || null;

  await db.insert(attendanceRequests).values({
    refId,
    submittedAt: new Date(),
    company: input.company,
    department: input.department,
    employeeName: input.employeeName,
    requestType: input.requestType,
    dateRequested: input.dateRequested,
    dateOfIncident: input.dateOfIncident,
    timeIn: input.timeIn || null,
    timeOut: input.timeOut || null,
    otHrs: otValue,
    requestedOtHrs: otValue,
    reason: input.reason,
    status: "Pending",
  });

  return refId;
}

export async function addManagerOwnRequest(input: {
  company: string;
  department: string;
  employeeName: string;
  managerName: string;
  requestType: string;
  dateRequested: string;
  dateOfIncident: string;
  reason: string;
  timeIn?: string | null;
  timeOut?: string | null;
  otHrs?: string | null;
}): Promise<string> {
  const db = getDb();
  const refId = await generateRefId();
  const otValue = input.otHrs || null;
  const now = new Date();
  const employeeName = input.employeeName.trim();
  const managerName = input.managerName.trim();

  if (employeeName.toLowerCase() !== managerName.toLowerCase()) {
    throw new Error("Manager own-slip filing requires the employee name to match the manager.");
  }

  await db.insert(attendanceRequests).values({
    refId,
    submittedAt: now,
    submittedBy: managerName,
    company: input.company,
    department: input.department,
    employeeName,
    requestType: input.requestType,
    dateRequested: input.dateRequested,
    dateOfIncident: input.dateOfIncident,
    timeIn: input.timeIn || null,
    timeOut: input.timeOut || null,
    otHrs: otValue,
    requestedOtHrs: otValue,
    reason: input.reason,
    status: "Approved",
    approvedBy: managerName,
    approvedOn: now,
  });

  return refId;
}

export async function getAllRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getApprovedRequests(includeArchived = false): Promise<AttendanceRequest[]> {
  const db = getDb();
  const conditions = includeArchived
    ? eq(attendanceRequests.status, "Approved")
    : and(
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, false),
      );

  return db
    .select()
    .from(attendanceRequests)
    .where(conditions)
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getAllApprovedRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.status, "Approved"))
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getArchivedRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(
      and(eq(attendanceRequests.status, "Approved"), eq(attendanceRequests.archived, true)),
    )
    .orderBy(desc(attendanceRequests.archivedAt));
}

export async function hrReturnApprovedToManager(
  refId: string,
  returnedBy: string,
  hrReturnReason: string,
): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const result = await db
    .update(attendanceRequests)
    .set({
      status: "Pending",
      approvedBy: null,
      approvedOn: null,
      hrReturnReason,
      hrReturnedBy: returnedBy,
      hrReturnedAt: now,
      archived: false,
      archivedAt: null,
      archivedBy: null,
    })
    .where(
      and(
        eq(attendanceRequests.refId, refId),
        eq(attendanceRequests.status, "Approved"),
        isNull(attendanceRequests.payrollConfirmedPeriodId),
      ),
    )
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export async function archiveRequest(
  refId: string,
  archivedBy: string,
  checkedOtHrs?: string | null,
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(attendanceRequests)
    .set({
      archived: true,
      archivedAt: new Date(),
      archivedBy,
      ...(checkedOtHrs ? { otHrs: checkedOtHrs } : {}),
    })
    .where(
      and(
        eq(attendanceRequests.refId, refId),
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, false),
      ),
    )
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export async function confirmPayrollPeriodRequests(
  refIds: string[],
  periodId: string,
  confirmedBy: string,
): Promise<number> {
  if (refIds.length === 0) {
    return 0;
  }

  const db = getDb();
  const now = new Date();
  const result = await db
    .update(attendanceRequests)
    .set({
      payrollConfirmedPeriodId: periodId,
      payrollConfirmedAt: now,
      payrollConfirmedBy: confirmedBy,
    })
    .where(
      and(
        inArray(attendanceRequests.refId, refIds),
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, true),
        isNull(attendanceRequests.payrollConfirmedPeriodId),
      ),
    )
    .returning({ id: attendanceRequests.id });

  return result.length;
}

export async function unarchiveRequest(refId: string): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(attendanceRequests)
    .set({
      archived: false,
      archivedAt: null,
      archivedBy: null,
    })
    .where(
      and(eq(attendanceRequests.refId, refId), eq(attendanceRequests.archived, true)),
    )
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export async function getRequestByRefId(refId: string): Promise<AttendanceRequest | undefined> {
  const db = getDb();
  const [request] = await db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.refId, refId))
    .limit(1);
  return request;
}

export async function getRequestsByRefIds(refIds: string[]): Promise<AttendanceRequest[]> {
  if (refIds.length === 0) {
    return [];
  }

  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(inArray(attendanceRequests.refId, refIds));
}

export async function getUnverifiedPendingRequests(
  scope?: RequestScope,
): Promise<AttendanceRequest[]> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(
        eq(attendanceRequests.status, "Pending"),
        isNull(attendanceRequests.verifiedOn),
        scopeCondition,
      )
    : and(eq(attendanceRequests.status, "Pending"), isNull(attendanceRequests.verifiedOn));

  return db
    .select()
    .from(attendanceRequests)
    .where(conditions)
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getVerifiedPendingRequests(
  scope?: RequestScope,
): Promise<AttendanceRequest[]> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(
        eq(attendanceRequests.status, "Pending"),
        isNotNull(attendanceRequests.verifiedOn),
        scopeCondition,
      )
    : and(eq(attendanceRequests.status, "Pending"), isNotNull(attendanceRequests.verifiedOn));

  return db
    .select()
    .from(attendanceRequests)
    .where(conditions)
    .orderBy(desc(attendanceRequests.verifiedOn));
}

export type VerificationRequestInput = {
  company: string;
  department: string;
  employeeName: string;
  requestType: string;
  dateRequested: string;
  dateOfIncident: string;
  timeIn?: string | null;
  timeOut?: string | null;
  otHrs?: string | null;
  reason: string;
  verificationNote?: string | null;
};

export async function verifyRequest(
  refId: string,
  input: VerificationRequestInput,
  verifiedBy: string,
  scope?: RequestScope,
): Promise<boolean> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(
        eq(attendanceRequests.refId, refId),
        eq(attendanceRequests.status, "Pending"),
        isNull(attendanceRequests.verifiedOn),
        scopeCondition,
      )
    : and(
        eq(attendanceRequests.refId, refId),
        eq(attendanceRequests.status, "Pending"),
        isNull(attendanceRequests.verifiedOn),
      );

  const otValue = input.otHrs || null;
  const now = new Date();

  const result = await db
    .update(attendanceRequests)
    .set({
      company: input.company,
      department: input.department,
      employeeName: input.employeeName,
      requestType: input.requestType,
      dateRequested: input.dateRequested || null,
      dateOfIncident: input.dateOfIncident,
      timeIn: input.timeIn || null,
      timeOut: input.timeOut || null,
      otHrs: otValue,
      requestedOtHrs: otValue,
      reason: input.reason,
      verificationNote: input.verificationNote || null,
      verifiedBy,
      verifiedOn: now,
      lastEditedBy: verifiedBy,
      lastEditedOn: now,
    })
    .where(conditions)
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export async function getPendingRequests(scope?: RequestScope): Promise<AttendanceRequest[]> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(eq(attendanceRequests.status, "Pending"), scopeCondition)
    : eq(attendanceRequests.status, "Pending");

  return db
    .select()
    .from(attendanceRequests)
    .where(conditions)
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getHistoryRequests(scope?: RequestScope): Promise<AttendanceRequest[]> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(ne(attendanceRequests.status, "Pending"), scopeCondition)
    : ne(attendanceRequests.status, "Pending");

  return db
    .select()
    .from(attendanceRequests)
    .where(conditions)
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function updateRequestStatus(
  refId: string,
  status: "Approved" | "Rejected",
  approvedBy: string = MANAGER_NAME,
  scope?: RequestScope,
  approvedOtHrs?: string | null,
  rejectionReason?: string | null,
): Promise<boolean> {
  const db = getDb();
  const scopeCondition = buildScopeConditions(scope);
  const conditions = scopeCondition
    ? and(eq(attendanceRequests.refId, refId), scopeCondition)
    : eq(attendanceRequests.refId, refId);

  const result = await db
    .update(attendanceRequests)
    .set({
      status,
      approvedBy,
      approvedOn: new Date(),
      ...(status === "Approved" && approvedOtHrs ? { otHrs: approvedOtHrs } : {}),
      ...(status === "Rejected" && rejectionReason ? { rejectionReason } : {}),
      hrReturnReason: null,
      hrReturnedBy: null,
      hrReturnedAt: null,
    })
    .where(and(conditions, eq(attendanceRequests.status, "Pending")))
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export async function updateEmployeePendingRequest(
  refId: string,
  input: {
    company: string;
    department: string;
    employeeName: string;
    requestType: string;
    dateRequested: string;
    dateOfIncident: string;
    reason: string;
    timeIn?: string | null;
    timeOut?: string | null;
    otHrs?: string | null;
  },
): Promise<boolean> {
  const db = getDb();
  const otValue = input.otHrs || null;

  const result = await db
    .update(attendanceRequests)
    .set({
      requestType: input.requestType,
      dateRequested: input.dateRequested || null,
      dateOfIncident: input.dateOfIncident,
      timeIn: input.timeIn || null,
      timeOut: input.timeOut || null,
      otHrs: otValue,
      requestedOtHrs: otValue,
      reason: input.reason,
      lastEditedBy: input.employeeName,
      lastEditedOn: new Date(),
    })
    .where(
      and(
        eq(attendanceRequests.refId, refId),
        eq(attendanceRequests.status, "Pending"),
        isNull(attendanceRequests.verifiedOn),
        eq(attendanceRequests.archived, false),
        eq(attendanceRequests.company, input.company),
        eq(attendanceRequests.department, input.department),
        eq(attendanceRequests.employeeName, input.employeeName),
      ),
    )
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export type AdminRequestInput = {
  company: string;
  department: string;
  employeeName: string;
  requestType: string;
  dateRequested: string;
  dateOfIncident: string;
  timeIn?: string | null;
  timeOut?: string | null;
  otHrs?: string | null;
  reason: string;
  verificationNote?: string | null;
};

export async function adminUpdateRequest(
  refId: string,
  input: AdminRequestInput,
  editedBy: string,
): Promise<boolean> {
  const db = getDb();
  const existing = await getRequestByRefId(refId);
  if (!existing) return false;

  const otValue = input.otHrs || null;
  const isPending = existing.status === "Pending";

  const result = await db
    .update(attendanceRequests)
    .set({
      company: input.company,
      department: input.department,
      employeeName: input.employeeName,
      requestType: input.requestType,
      dateRequested: input.dateRequested || null,
      dateOfIncident: input.dateOfIncident,
      timeIn: input.timeIn || null,
      timeOut: input.timeOut || null,
      otHrs: otValue,
      ...(isPending ? { requestedOtHrs: otValue } : {}),
      reason: input.reason,
      verificationNote: input.verificationNote?.trim() || null,
      lastEditedBy: editedBy,
      lastEditedOn: new Date(),
    })
    .where(eq(attendanceRequests.refId, refId))
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export function toDisplayRow(request: AttendanceRequest) {
  return {
    ref_id: request.refId,
    submitted_at: request.submittedAt?.toISOString() ?? "",
    company: request.company ?? "",
    department: request.department ?? "",
    employee_name: request.employeeName,
    request_type: request.requestType,
    date_requested: request.dateRequested ?? "",
    date_of_incident: request.dateOfIncident,
    time_in: request.timeIn ?? "",
    time_out: request.timeOut ?? "",
    ot_hrs: request.otHrs ?? "",
    requested_ot_hrs: request.requestedOtHrs ?? "",
    reason: request.reason,
    status: request.status,
    verified_by: request.verifiedBy ?? "",
    verified_on: request.verifiedOn?.toISOString() ?? "",
    verification_note: request.verificationNote ?? "",
    approved_by: request.approvedBy ?? "",
    approved_on: request.approvedOn?.toISOString() ?? "",
    submitted_by: request.submittedBy ?? "",
    payroll_confirmed_period_id: request.payrollConfirmedPeriodId ?? "",
    payroll_confirmed_at: request.payrollConfirmedAt?.toISOString() ?? "",
    payroll_confirmed_by: request.payrollConfirmedBy ?? "",
  };
}
