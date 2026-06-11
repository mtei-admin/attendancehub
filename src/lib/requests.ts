import { desc, eq } from "drizzle-orm";

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
  employeeName: string;
  requestType: string;
  dateOfIncident: string;
  reason: string;
  timeIn?: string | null;
  otHrs?: string | null;
}): Promise<string> {
  const db = getDb();
  const refId = await generateRefId();

  await db.insert(attendanceRequests).values({
    refId,
    submittedAt: new Date(),
    employeeName: input.employeeName,
    requestType: input.requestType,
    dateOfIncident: input.dateOfIncident,
    timeIn: input.timeIn || null,
    otHrs: input.otHrs || null,
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

export async function getApprovedRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.status, "Approved"))
    .orderBy(desc(attendanceRequests.submittedAt));
}

export async function getPendingRequests(): Promise<AttendanceRequest[]> {
  const db = getDb();
  return db
    .select()
    .from(attendanceRequests)
    .where(eq(attendanceRequests.status, "Pending"))
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
    employee_name: request.employeeName,
    request_type: request.requestType,
    date_of_incident: request.dateOfIncident,
    time_in: request.timeIn ?? "",
    ot_hrs: request.otHrs ?? "",
    reason: request.reason,
    status: request.status,
    approved_by: request.approvedBy ?? "",
    approved_on: request.approvedOn?.toISOString() ?? "",
  };
}
