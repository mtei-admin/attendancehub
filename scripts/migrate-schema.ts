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
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

const EMPLOYEE_ALTER_STATEMENTS = [
  `ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_type text NOT NULL DEFAULT 'Rank & File'`,
];

const CREATE_EMPLOYEES_TABLE = `
CREATE TABLE IF NOT EXISTS employees (
  id serial PRIMARY KEY,
  full_name text NOT NULL,
  department_id integer NOT NULL REFERENCES departments(id),
  employee_type text NOT NULL DEFAULT 'Rank & File',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
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

  console.log("Schema migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
