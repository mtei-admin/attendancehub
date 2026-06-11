import { date, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const attendanceRequests = pgTable("attendance_requests", {
  id: serial("id").primaryKey(),
  refId: text("ref_id").notNull().unique(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  employeeName: text("employee_name").notNull(),
  requestType: text("request_type").notNull(),
  dateOfIncident: date("date_of_incident").notNull(),
  timeIn: text("time_in"),
  otHrs: text("ot_hrs"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  approvedBy: text("approved_by"),
  approvedOn: timestamp("approved_on", { withTimezone: true }),
});

export type AttendanceRequest = typeof attendanceRequests.$inferSelect;
export type NewAttendanceRequest = typeof attendanceRequests.$inferInsert;
