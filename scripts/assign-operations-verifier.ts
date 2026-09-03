import { neon } from "@neondatabase/serverless";

const COMPANY = "MTEI";
const DEPARTMENT = "Operations";
const VERIFIER_NAME = "FORMON, JESSICA PAULLYN BASILO";
const EXCLUDE_NAME = "BAGASBAS, BRUCE PETER MENAC";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required.");
  const sql = neon(url);

  const verifiers = (await sql`
    SELECT id, full_name, username, company, is_active
    FROM users
    WHERE role = 'Verifier'
      AND LOWER(TRIM(full_name)) = LOWER(${VERIFIER_NAME})
  `) as {
    id: number;
    full_name: string;
    username: string;
    company: string | null;
    is_active: boolean;
  }[];

  if (verifiers.length === 0) {
    throw new Error(`Verifier not found: ${VERIFIER_NAME}`);
  }
  const verifier = verifiers[0]!;
  if (!verifier.is_active) {
    throw new Error(`Verifier is inactive: ${VERIFIER_NAME}`);
  }
  if ((verifier.company ?? "").trim().toLowerCase() !== COMPANY.toLowerCase()) {
    throw new Error(
      `Verifier company is "${verifier.company}", expected ${COMPANY}.`,
    );
  }

  const employees = (await sql`
    SELECT e.id, e.full_name, e.skip_verification, e.is_active
    FROM employees e
    JOIN departments d ON d.id = e.department_id
    WHERE d.company = ${COMPANY}
      AND d.name = ${DEPARTMENT}
      AND e.is_active = true
    ORDER BY e.full_name
  `) as {
    id: number;
    full_name: string;
    skip_verification: boolean;
    is_active: boolean;
  }[];

  const targets = employees.filter(
    (row) => row.full_name.trim().toLowerCase() !== EXCLUDE_NAME.toLowerCase(),
  );
  const excluded = employees.filter(
    (row) => row.full_name.trim().toLowerCase() === EXCLUDE_NAME.toLowerCase(),
  );

  console.log(`Verifier: ${verifier.full_name} (id=${verifier.id}, ${verifier.username})`);
  console.log(`Operations employees: ${employees.length}`);
  console.log(`Assigning: ${targets.length}`);
  console.log(`Excluding: ${excluded.map((row) => row.full_name).join(", ") || "(none found)"}`);

  for (const employee of targets) {
    await sql`
      DELETE FROM employee_verifiers
      WHERE employee_id = ${employee.id}
    `;
    await sql`
      INSERT INTO employee_verifiers (employee_id, verifier_user_id)
      VALUES (${employee.id}, ${verifier.id})
      ON CONFLICT (employee_id, verifier_user_id) DO NOTHING
    `;
    if (employee.skip_verification) {
      await sql`
        UPDATE employees
        SET skip_verification = false
        WHERE id = ${employee.id}
      `;
      console.log(`  cleared No Verifier + assigned: ${employee.full_name}`);
    } else {
      console.log(`  assigned: ${employee.full_name}`);
    }
  }

  // Leave Bruce with no specific assignment (policy B / or existing state).
  // Do not clear his rows unless he had Jessica — leave him alone entirely.
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
