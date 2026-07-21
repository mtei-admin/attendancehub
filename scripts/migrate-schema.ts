import { neon } from "@neondatabase/serverless";

import { COMPANIES, DEFAULT_COMPANY, DEPARTMENTS, EMPLOYEES_BY_DEPARTMENT } from "../src/lib/constants";

const ATTENDANCE_ALTER_STATEMENTS = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS department text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS date_requested date`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS time_out text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS archived_at timestamptz`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS archived_by text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS rejection_reason text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS company text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hint text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS company text`,
];

const DEPARTMENT_ALTER_STATEMENTS = [
  `ALTER TABLE departments ADD COLUMN IF NOT EXISTS company text NOT NULL DEFAULT '${DEFAULT_COMPANY}'`,
  `UPDATE departments SET company = '${DEFAULT_COMPANY}' WHERE company IS NULL OR company = ''`,
  `ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key`,
  `DROP INDEX IF EXISTS departments_name_key`,
  `CREATE UNIQUE INDEX IF NOT EXISTS departments_company_name_unique ON departments (company, name)`,
];

const BACKFILL_STATEMENTS = [
  `UPDATE attendance_requests SET company = '${DEFAULT_COMPANY}' WHERE company IS NULL OR company = ''`,
  `UPDATE users SET company = '${DEFAULT_COMPANY}' WHERE role = 'Manager' AND (company IS NULL OR company = '')`,
];

const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  password_hint text,
  full_name text NOT NULL,
  role text NOT NULL,
  company text,
  department text,
  hr_scope text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_DEPARTMENTS_TABLE = `
CREATE TABLE IF NOT EXISTS departments (
  id serial PRIMARY KEY,
  company text NOT NULL DEFAULT '${DEFAULT_COMPANY}',
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_COMPANIES_TABLE = `
CREATE TABLE IF NOT EXISTS companies (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  basecamp_webhook_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const COMPANIES_ALTER_STATEMENTS = [
  `ALTER TABLE companies ADD COLUMN IF NOT EXISTS basecamp_webhook_url text`,
];

const EMPLOYEE_ALTER_STATEMENTS = [
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type text NOT NULL DEFAULT 'Rank & File'`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS email text`,
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS biometric_no integer`,
  `CREATE UNIQUE INDEX IF NOT EXISTS employees_biometric_no_unique ON employees (biometric_no)`,
];

const ATTENDANCE_ALTER_EXTRA = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS requested_ot_hrs text`,
];

const ATTENDANCE_VERIFICATION_ALTER = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS verified_by text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS verified_on timestamptz`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS verification_note text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS last_edited_by text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS last_edited_on timestamptz`,
];

const ATTENDANCE_SUBMITTED_BY_ALTER = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS submitted_by text`,
];

const ATTENDANCE_PAYROLL_CONFIRM_ALTER = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS payroll_confirmed_period_id text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS payroll_confirmed_at timestamptz`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS payroll_confirmed_by text`,
];

const ATTENDANCE_HR_RETURN_ALTER = [
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS hr_return_reason text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS hr_returned_by text`,
  `ALTER TABLE attendance_requests ADD COLUMN IF NOT EXISTS hr_returned_at timestamptz`,
];

const BRUCE_OWN_SLIP_BACKFILL = `
UPDATE attendance_requests
SET
  status = 'Approved',
  submitted_by = COALESCE(NULLIF(TRIM(submitted_by), ''), employee_name),
  approved_by = COALESCE(NULLIF(TRIM(approved_by), ''), employee_name),
  approved_on = COALESCE(approved_on, submitted_at, NOW())
WHERE LOWER(TRIM(employee_name)) = LOWER('BAGASBAS, BRUCE PETER MENAC')
  AND status = 'Pending'
  AND archived = false
  AND (
    submitted_by IS NULL
    OR LOWER(TRIM(submitted_by)) = LOWER(TRIM(employee_name))
  )
`;

const CREATE_OT_MANUAL_OVERRIDES_TABLE = `
CREATE TABLE IF NOT EXISTS ot_manual_overrides (
  id serial PRIMARY KEY,
  company text NOT NULL,
  department text NOT NULL,
  employee_name text NOT NULL,
  payroll_group text NOT NULL DEFAULT 'Confi',
  period_start date NOT NULL,
  period_end date NOT NULL,
  hours text NOT NULL DEFAULT '0',
  note text,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

const RECORD_REQUEST_LOGS_ALTER = [
  `ALTER TABLE record_request_logs ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'email'`,
  `ALTER TABLE record_request_logs ADD COLUMN IF NOT EXISTS record_ref_id text`,
];

const OT_MANUAL_OVERRIDE_INDEX = `
CREATE UNIQUE INDEX IF NOT EXISTS ot_manual_overrides_employee_period_unique
ON ot_manual_overrides (company, department, employee_name, payroll_group, period_start, period_end);
`;

const CREATE_EMPLOYEES_TABLE = `
CREATE TABLE IF NOT EXISTS employees (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  employee_type text NOT NULL DEFAULT 'Rank & File',
  email text,
  biometric_no integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_RECORD_REQUEST_LOGS_TABLE = `
CREATE TABLE IF NOT EXISTS record_request_logs (
  id serial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  employee_id integer NOT NULL REFERENCES employees(id),
  employee_name text NOT NULL,
  company text NOT NULL,
  department text NOT NULL,
  email_sent_to text NOT NULL,
  submitted_from date NOT NULL,
  submitted_to date NOT NULL,
  request_type_filter text,
  status_filter text,
  row_count integer NOT NULL DEFAULT 0,
  ip_address text,
  user_agent text
);
`;

const CREATE_PAYROLL_CUTOFF_RULES_TABLE = `
CREATE TABLE IF NOT EXISTS payroll_cutoff_rules (
  id serial PRIMARY KEY,
  employee_type text NOT NULL UNIQUE,
  cutoff_day_1 integer NOT NULL,
  cutoff_day_2 integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
`;

const CREATE_OT_ELIGIBLE_TYPES_TABLE = `
CREATE TABLE IF NOT EXISTS ot_eligible_request_types (
  request_type text PRIMARY KEY,
  is_active boolean NOT NULL DEFAULT true
);
`;

async function seedDepartmentsAndEmployees(
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>,
) {
  const existing = (await sql`SELECT COUNT(*)::int AS count FROM departments`) as {
    count: number;
  }[];
  if ((existing[0]?.count ?? 0) > 0) {
    console.log("SKIP: departments already seeded");
    return;
  }

  for (const name of DEPARTMENTS) {
    await sql`
      INSERT INTO departments (company, name)
      VALUES (${DEFAULT_COMPANY}, ${name})
      ON CONFLICT DO NOTHING
    `;
  }
  console.log(`OK: seeded ${DEPARTMENTS.length} departments for ${DEFAULT_COMPANY}`);

  const deptRows = await sql`
    SELECT id, name FROM departments WHERE company = ${DEFAULT_COMPANY}
  `;
  const deptByName = new Map(
    (deptRows as { id: number; name: string }[]).map((row) => [row.name, row.id]),
  );

  let employeeCount = 0;
  for (const [deptName, names] of Object.entries(EMPLOYEES_BY_DEPARTMENT)) {
    const departmentId = deptByName.get(deptName);
    if (!departmentId) continue;

    for (const fullName of names) {
      await sql`
        INSERT INTO employees (full_name, department_id)
        VALUES (${fullName}, ${departmentId})
      `;
      employeeCount += 1;
    }
  }

  console.log(`OK: seeded ${employeeCount} employees`);
}

async function seedCompanies(
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>,
) {
  for (const name of COMPANIES) {
    await sql`
      INSERT INTO companies (name)
      VALUES (${name})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  const deptCompanies = (await sql`
    SELECT DISTINCT company AS name
    FROM departments
    WHERE company IS NOT NULL AND company != ''
  `) as { name: string }[];

  for (const row of deptCompanies) {
    await sql`
      INSERT INTO companies (name)
      VALUES (${row.name})
      ON CONFLICT (name) DO NOTHING
    `;
  }

  console.log(`OK: seeded companies (${COMPANIES.length} defaults + department names)`);
}

async function seedPayrollAndOtSettings(
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>,
) {
  await sql`
    INSERT INTO payroll_cutoff_rules (employee_type, cutoff_day_1, cutoff_day_2)
    VALUES ('Confi', 10, 25)
    ON CONFLICT (employee_type) DO NOTHING
  `;
  await sql`
    INSERT INTO payroll_cutoff_rules (employee_type, cutoff_day_1, cutoff_day_2)
    VALUES ('Rank & File', 14, 29)
    ON CONFLICT (employee_type) DO NOTHING
  `;

  const defaultActive = ["Overtime", "Holiday/Rest Day Work"];
  const allTypes = [
    "Late/Undertime",
    "Absent/Leave",
    "Early/Overbreak",
    "Overtime",
    "Holiday/Rest Day Work",
    "OT Offset",
    "Work From Home",
    "Trip Ticket",
    "Change Shift",
  ];

  for (const requestType of allTypes) {
    const isActive = defaultActive.includes(requestType);
    await sql`
      INSERT INTO ot_eligible_request_types (request_type, is_active)
      VALUES (${requestType}, ${isActive})
      ON CONFLICT (request_type) DO NOTHING
    `;
  }

  console.log("OK: payroll cutoff rules and OT-eligible request types seeded");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = neon(url);

  for (const statement of ATTENDANCE_ALTER_STATEMENTS) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await sql(CREATE_USERS_TABLE);
  console.log("OK: users table ready");

  await sql(CREATE_DEPARTMENTS_TABLE);
  console.log("OK: departments table ready");

  for (const statement of DEPARTMENT_ALTER_STATEMENTS) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await sql(CREATE_COMPANIES_TABLE);
  console.log("OK: companies table ready");

  for (const statement of COMPANIES_ALTER_STATEMENTS) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await seedCompanies(sql);

  await sql(CREATE_EMPLOYEES_TABLE);
  console.log("OK: employees table ready");

  for (const statement of EMPLOYEE_ALTER_STATEMENTS) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  for (const statement of BACKFILL_STATEMENTS) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await seedDepartmentsAndEmployees(sql);

  await sql(CREATE_PAYROLL_CUTOFF_RULES_TABLE);
  console.log("OK: payroll_cutoff_rules table ready");

  await sql(CREATE_OT_ELIGIBLE_TYPES_TABLE);
  console.log("OK: ot_eligible_request_types table ready");

  await seedPayrollAndOtSettings(sql);

  for (const statement of ATTENDANCE_ALTER_EXTRA) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await sql(`
    UPDATE attendance_requests
    SET requested_ot_hrs = ot_hrs
    WHERE requested_ot_hrs IS NULL AND ot_hrs IS NOT NULL AND ot_hrs != ''
  `);
  console.log("OK: backfilled requested_ot_hrs from ot_hrs");

  await sql(CREATE_RECORD_REQUEST_LOGS_TABLE);
  console.log("OK: record_request_logs table ready");

  for (const statement of ATTENDANCE_VERIFICATION_ALTER) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await sql(CREATE_OT_MANUAL_OVERRIDES_TABLE);
  console.log("OK: ot_manual_overrides table ready");

  await sql(OT_MANUAL_OVERRIDE_INDEX);
  console.log("OK: ot_manual_overrides unique index ready");

  for (const statement of RECORD_REQUEST_LOGS_ALTER) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  for (const statement of ATTENDANCE_SUBMITTED_BY_ALTER) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  for (const statement of ATTENDANCE_PAYROLL_CONFIRM_ALTER) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  for (const statement of ATTENDANCE_HR_RETURN_ALTER) {
    await sql(statement);
    console.log(`OK: ${statement}`);
  }

  await sql(BRUCE_OWN_SLIP_BACKFILL);
  console.log("OK: moved Bruce Bagasbas own pending slips to HR Confi pending");

  console.log("Schema migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
