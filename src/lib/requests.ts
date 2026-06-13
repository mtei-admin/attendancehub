import { and, desc, eq, ne } from "drizzle-orm";

import { MANAGER_NAME } from "./constants";
import { getDb } from "./db";
import { attendanceRequests, type AttendanceRequest } from "./schema";

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

export async function addRequest(input: {
  department: string;
  employeeName: string;
  requestType: string;
  dateRequested: string;
  dateOfIncident: string;
  reason: string;
  timeIn?: string | null;
  timeOut?: string | null;
}): Promise<string> {
  const db = getDb();
  const refId = await generateRefId();

  await db.insert(attendanceRequests).values({
    refId,
    submittedAt: new Date(),
    department: input.department,
    employeeName: input.employeeName,
    requestType: input.requestType,
    dateRequested: input.dateRequested,
    dateOfIncident: input.dateOfIncident,
    timeIn: input.timeIn || null,
    timeOut: input.timeOut || null,
    reason: input.reason,
    status: "Pending",
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

export async function archiveRequest(
  refId: string,
  archivedBy: string,
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(attendanceRequests)
    .set({
      archived: true,
      archivedAt: new Date(),
      archivedBy,
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

export async function getPendingRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.status, "Pending"))
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getHistoryRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(ne(attendanceRequests.status, "Pending"))
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function updateRequestStatus(
  refId: string,
  status: "Approved" | "Rejected",
  approvedBy: string = MANAGER_NAME,
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .update(attendanceRequests)
    .set({
      status,
      approvedBy,
      approvedOn: new Date(),
    })
    .where(eq(attendanceRequests.refId, refId))
    .returning({ id: attendanceRequests.id });

  return result.length > 0;
}

export function toDisplayRow(request: AttendanceRequest) {
  return {
    ref_id: request.refId,
    submitted_at: request.submittedAt?.toISOString() ?? "",
    department: request.department ?? "",
    employee_name: request.employeeName,
    request_type: request.requestType,
    date_requested: request.dateRequested ?? "",
    date_of_incident: request.dateOfIncident,
    time_in: request.timeIn ?? "",
    time_out: request.timeOut ?? "",
    ot_hrs: request.otHrs ?? "",
    reason: request.reason,
    status: request.status,
    approved_by: request.approvedBy ?? "",
    approved_on: request.approvedOn?.toISOString() ?? "",
  };
}
