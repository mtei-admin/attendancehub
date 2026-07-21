import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

import { getDb } from "./db";
import { attendanceRequests, recordRequestLogs, type AttendanceRequest } from "./schema";

export type RecordRequestFilters = {
  company: string;
  department: string;
  employeeName: string;
  submittedFrom: string;
  submittedTo: string;
  requestType?: string;
  status?: string;
};

export type RecordRequestAction = "view" | "email" | "edit";

export type RecordRequestAuditInput = RecordRequestFilters & {
  employeeId: number;
  rowCount: number;
  action: RecordRequestAction;
  emailSentTo?: string;
  recordRefId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export function canEmployeeEditRecord(request: AttendanceRequest): boolean {
  return (
    request.status === "Pending" && !request.verifiedOn && !request.archived
  );
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 3;

function submittedAtRange(submittedFrom: string, submittedTo: string) {
  const start = new Date(`${submittedFrom}T00:00:00.000Z`);
  const end = new Date(`${submittedTo}T23:59:59.999Z`);
  return { start, end };
}

export async function countRecentRecordRequests(employeeId: number): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(recordRequestLogs)
    .where(
      and(
        eq(recordRequestLogs.employeeId, employeeId),
        gte(recordRequestLogs.createdAt, since),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function isRecordRequestRateLimited(employeeId: number): Promise<boolean> {
  const count = await countRecentRecordRequests(employeeId);
  return count >= RATE_LIMIT_MAX;
}

export async function queryEmployeeRecords(
  filters: RecordRequestFilters,
): Promise<AttendanceRequest[]> {
  const db = getDb();
  const { start, end } = submittedAtRange(filters.submittedFrom, filters.submittedTo);

  const conditions = [
    eq(attendanceRequests.company, filters.company),
    eq(attendanceRequests.department, filters.department),
    eq(attendanceRequests.employeeName, filters.employeeName),
    gte(attendanceRequests.submittedAt, start),
    lte(attendanceRequests.submittedAt, end),
  ];

  if (filters.requestType) {
    conditions.push(eq(attendanceRequests.requestType, filters.requestType));
  }

  if (filters.status) {
    conditions.push(eq(attendanceRequests.status, filters.status));
  }

  return db
    .select()
    .from(attendanceRequests)
    .where(and(...conditions))
    .orderBy(desc(attendanceRequests.submittedAt));
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function formatSubmittedAt(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 19).replace("T", " ");
}

export function recordsToCsv(rows: AttendanceRequest[]): string {
  const headers = [
    "Ref ID",
    "Request type",
    "Date submitted",
    "Date of incident",
    "Status",
    "Verified by",
    "Verified on",
    "Verification note",
    "OT hours requested",
    "OT hours approved",
    "HR checked",
    "Rejection reason",
  ];

  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.refId,
        row.requestType,
        formatSubmittedAt(row.submittedAt),
        row.dateOfIncident,
        row.status,
        row.verifiedBy ?? "",
        formatSubmittedAt(row.verifiedOn),
        row.verificationNote ?? "",
        row.requestedOtHrs ?? row.otHrs ?? "",
        row.status === "Approved" ? row.otHrs ?? "" : "",
        row.archived ? "Yes" : "No",
        row.rejectionReason ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return lines.join("\n");
}

export function buildRecordsEmailContent(input: {
  employeeName: string;
  company: string;
  department: string;
  filters: RecordRequestFilters;
  rowCount: number;
}): { subject: string; text: string; html: string; filename: string } {
  const typeLabel = input.filters.requestType ?? "All types";
  const statusLabel = input.filters.status ?? "All statuses";
  const subject = `Your attendance records — ${input.company} — ${input.filters.submittedFrom} to ${input.filters.submittedTo}`;

  const text = [
    `Hello ${input.employeeName},`,
    "",
    "Your requested attendance records are attached as a CSV file.",
    "",
    `Company: ${input.company}`,
    `Department: ${input.department}`,
    `Date submitted from: ${input.filters.submittedFrom}`,
    `Date submitted to: ${input.filters.submittedTo}`,
    `Request type: ${typeLabel}`,
    `Status: ${statusLabel}`,
    `Records included: ${input.rowCount}`,
    "",
    "If you did not request this email, please contact HR immediately.",
    "",
    "— AttendanceHub",
  ].join("\n");

  const html = `
    <p>Hello ${input.employeeName},</p>
    <p>Your requested attendance records are attached as a CSV file.</p>
    <ul>
      <li><strong>Company:</strong> ${input.company}</li>
      <li><strong>Department:</strong> ${input.department}</li>
      <li><strong>Date submitted:</strong> ${input.filters.submittedFrom} to ${input.filters.submittedTo}</li>
      <li><strong>Request type:</strong> ${typeLabel}</li>
      <li><strong>Status:</strong> ${statusLabel}</li>
      <li><strong>Records included:</strong> ${input.rowCount}</li>
    </ul>
    <p>If you did not request this email, please contact HR immediately.</p>
    <p>— AttendanceHub</p>
  `.trim();

  const safeDate = input.filters.submittedTo.replace(/-/g, "");
  const filename = `attendance_records_${safeDate}.csv`;

  return { subject, text, html, filename };
}

export async function logRecordRequest(input: RecordRequestAuditInput): Promise<void> {
  const db = getDb();
  await db.insert(recordRequestLogs).values({
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    company: input.company,
    department: input.department,
    emailSentTo: input.emailSentTo ?? "",
    submittedFrom: input.submittedFrom,
    submittedTo: input.submittedTo,
    requestTypeFilter: input.requestType ?? null,
    statusFilter: input.status ?? null,
    rowCount: input.rowCount,
    action: input.action,
    recordRefId: input.recordRefId ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}

export async function listRecordRequestLogs(limit = 8) {
  const db = getDb();
  return db
    .select()
    .from(recordRequestLogs)
    .orderBy(desc(recordRequestLogs.createdAt))
    .limit(limit);
}
