import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  hrScope: text("hr_scope"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const attendanceRequests = pgTable("attendance_requests", {
  id: serial("id").primaryKey(),
  refId: text("ref_id").notNull().unique(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  department: text("department"),
  employeeName: text("employee_name").notNull(),
  requestType: text("request_type").notNull(),
  dateRequested: date("date_requested"),
  dateOfIncident: date("date_of_incident").notNull(),
  timeIn: text("time_in"),
  timeOut: text("time_out"),
  otHrs: text("ot_hrs"),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  approvedBy: text("approved_by"),
  approvedOn: timestamp("approved_on", { withTimezone: true }),
  archived: boolean("archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: text("archived_by"),
});

export type AttendanceRequest = typeof attendanceRequests.$inferSelect;
export type NewAttendanceRequest = typeof attendanceRequests.$inferInsert;
