import {
  boolean,
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { DEFAULT_COMPANY } from "./constants";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;

export const departments = pgTable(
  "departments",
  {
    id: serial("id").primaryKey(),
    company: text("company").notNull().default(DEFAULT_COMPANY),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyNameIdx: uniqueIndex("departments_company_name_unique").on(table.company, table.name),
  }),
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export const employees = pgTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    departmentId: integer("department_id")
      .notNull()
      .references(() => departments.id),
    employeeType: text("employee_type").notNull().default("Rank & File"),
    email: text("email"),
    biometricNo: integer("biometric_no"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    biometricNoIdx: uniqueIndex("employees_biometric_no_unique").on(table.biometricNo),
  }),
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordHint: text("password_hint"),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  company: text("company"),
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
  submittedBy: text("submitted_by"),
  company: text("company"),
  department: text("department"),
  employeeName: text("employee_name").notNull(),
  requestType: text("request_type").notNull(),
  dateRequested: date("date_requested"),
  dateOfIncident: date("date_of_incident").notNull(),
  timeIn: text("time_in"),
  timeOut: text("time_out"),
  otHrs: text("ot_hrs"),
  requestedOtHrs: text("requested_ot_hrs"),
  reason: text("reason").notNull(),
  rejectionReason: text("rejection_reason"),
  status: text("status").notNull().default("Pending"),
  verifiedBy: text("verified_by"),
  verifiedOn: timestamp("verified_on", { withTimezone: true }),
  verificationNote: text("verification_note"),
  lastEditedBy: text("last_edited_by"),
  lastEditedOn: timestamp("last_edited_on", { withTimezone: true }),
  approvedBy: text("approved_by"),
  approvedOn: timestamp("approved_on", { withTimezone: true }),
  archived: boolean("archived").notNull().default(false),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  archivedBy: text("archived_by"),
});

export type AttendanceRequest = typeof attendanceRequests.$inferSelect;
export type NewAttendanceRequest = typeof attendanceRequests.$inferInsert;

export const payrollCutoffRules = pgTable("payroll_cutoff_rules", {
  id: serial("id").primaryKey(),
  employeeType: text("employee_type").notNull().unique(),
  cutoffDay1: integer("cutoff_day_1").notNull(),
  cutoffDay2: integer("cutoff_day_2").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PayrollCutoffRule = typeof payrollCutoffRules.$inferSelect;

export const otEligibleRequestTypes = pgTable("ot_eligible_request_types", {
  requestType: text("request_type").primaryKey(),
  isActive: boolean("is_active").notNull().default(true),
});

export type OtEligibleRequestType = typeof otEligibleRequestTypes.$inferSelect;

export const recordRequestLogs = pgTable("record_request_logs", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  company: text("company").notNull(),
  department: text("department").notNull(),
  emailSentTo: text("email_sent_to").notNull(),
  submittedFrom: date("submitted_from").notNull(),
  submittedTo: date("submitted_to").notNull(),
  requestTypeFilter: text("request_type_filter"),
  statusFilter: text("status_filter"),
  rowCount: integer("row_count").notNull().default(0),
  action: text("action").notNull().default("email"),
  recordRefId: text("record_ref_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export type RecordRequestLog = typeof recordRequestLogs.$inferSelect;

export const otManualOverrides = pgTable(
  "ot_manual_overrides",
  {
    id: serial("id").primaryKey(),
    company: text("company").notNull(),
    department: text("department").notNull(),
    employeeName: text("employee_name").notNull(),
    payrollGroup: text("payroll_group").notNull().default("Confi"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    hours: text("hours").notNull().default("0"),
    note: text("note"),
    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeePeriodIdx: uniqueIndex("ot_manual_overrides_employee_period_unique").on(
      table.company,
      table.department,
      table.employeeName,
      table.payrollGroup,
      table.periodStart,
      table.periodEnd,
    ),
  }),
);

export type OtManualOverride = typeof otManualOverrides.$inferSelect;
export type NewOtManualOverride = typeof otManualOverrides.$inferInsert;
