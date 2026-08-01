/**
 * One-shot merge: MTEI Finance + Importation → Finance & Importation
 *
 * Order:
 * 1. Rename/keep survivor department as Finance & Importation
 * 2. Move roster employees off Importation onto survivor
 * 3. Rewrite department text on slips, portal users, OT tables, record logs
 * 4. Deactivate Importation
 *
 * Usage:
 *   npm run db:merge:finance-importation
 *   npm run db:merge:finance-importation -- --dry-run
 */
import { neon } from "@neondatabase/serverless";

const COMPANY = "MTEI";
const OLD_FINANCE = "Finance";
const OLD_IMPORTATION = "Importation";
const NEW_NAME = "Finance & Importation";

type DeptRow = {
  id: number;
  name: string;
  is_active: boolean;
  basecamp_webhook_url: string | null;
};

type CountRow = { count: number };

type UserRow = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  department: string | null;
};

function isDryRun(argv: string[]): boolean {
  return argv.includes("--dry-run");
}

async function main() {
  const dryRun = isDryRun(process.argv.slice(2));
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required.");
  }

  const sql = neon(url);

  console.log(
    dryRun
      ? `DRY RUN — merge ${COMPANY} ${OLD_FINANCE} + ${OLD_IMPORTATION} → ${NEW_NAME}`
      : `APPLY — merge ${COMPANY} ${OLD_FINANCE} + ${OLD_IMPORTATION} → ${NEW_NAME}`,
  );

  const deptRows = (await sql`
    SELECT id, name, is_active, basecamp_webhook_url
    FROM departments
    WHERE company = ${COMPANY}
      AND name IN (${OLD_FINANCE}, ${OLD_IMPORTATION}, ${NEW_NAME})
    ORDER BY name
  `) as DeptRow[];

  const byName = new Map(deptRows.map((row) => [row.name, row]));
  const existingNew = byName.get(NEW_NAME);
  const finance = byName.get(OLD_FINANCE);
  const importation = byName.get(OLD_IMPORTATION);

  if (!existingNew && !finance) {
    throw new Error(
      `Neither "${NEW_NAME}" nor "${OLD_FINANCE}" exists for ${COMPANY}. Aborting.`,
    );
  }

  if (existingNew && finance) {
    throw new Error(
      `Both "${OLD_FINANCE}" (id=${finance.id}) and "${NEW_NAME}" (id=${existingNew.id}) exist. Resolve manually before re-running.`,
    );
  }

  const survivor = existingNew ?? finance!;
  const survivorWillRename = !existingNew && finance != null;

  const importationEmployeeCount = importation
    ? ((
        await sql`
          SELECT COUNT(*)::int AS count
          FROM employees
          WHERE department_id = ${importation.id}
        `
      ) as CountRow[])[0]?.count ?? 0
    : 0;

  const oldTextNames = [OLD_FINANCE, OLD_IMPORTATION].filter(
    (name) => name !== NEW_NAME,
  );

  const slipCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM attendance_requests
      WHERE company = ${COMPANY}
        AND department = ANY(${oldTextNames})
    `
  )[0] as CountRow | undefined;

  const userCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM users
      WHERE company = ${COMPANY}
        AND department = ANY(${oldTextNames})
    `
  )[0] as CountRow | undefined;

  const otManualCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM ot_manual_overrides
      WHERE company = ${COMPANY}
        AND department = ANY(${oldTextNames})
    `
  )[0] as CountRow | undefined;

  const otBalanceCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM ot_offset_balance_overrides
      WHERE company = ${COMPANY}
        AND department = ANY(${oldTextNames})
    `
  )[0] as CountRow | undefined;

  const logCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM record_request_logs
      WHERE company = ${COMPANY}
        AND department = ANY(${oldTextNames})
    `
  )[0] as CountRow | undefined;

  const scopedUsers = (await sql`
    SELECT id, username, full_name, role, department
    FROM users
    WHERE company = ${COMPANY}
      AND department = ANY(${[...oldTextNames, NEW_NAME]})
      AND role IN ('Manager', 'Verifier')
    ORDER BY role, full_name
  `) as UserRow[];

  console.log("Before:");
  console.log(
    `  survivor dept: id=${survivor.id} name="${survivor.name}" active=${survivor.is_active}`,
  );
  console.log(
    `  importation dept: ${
      importation
        ? `id=${importation.id} active=${importation.is_active} employees=${importationEmployeeCount}`
        : "(not found — skip roster move / deactivate)"
    }`,
  );
  if (importation?.basecamp_webhook_url) {
    console.log(
      `  NOTE: Importation has basecamp_webhook_url; survivor keeps its own URL after merge.`,
    );
  }
  console.log(`  slips to rewrite: ${slipCount?.count ?? 0}`);
  console.log(`  users to rewrite: ${userCount?.count ?? 0}`);
  console.log(`  ot_manual_overrides to rewrite: ${otManualCount?.count ?? 0}`);
  console.log(
    `  ot_offset_balance_overrides to rewrite: ${otBalanceCount?.count ?? 0}`,
  );
  console.log(`  record_request_logs to rewrite: ${logCount?.count ?? 0}`);
  console.log("  Manager/Verifier scopes touching these departments:");
  if (scopedUsers.length === 0) {
    console.log("    (none)");
  } else {
    for (const user of scopedUsers) {
      console.log(
        `    [${user.role}] ${user.full_name} (${user.username}) → ${user.department}`,
      );
    }
  }

  if (dryRun) {
    console.log("DRY RUN complete — no changes written.");
    return;
  }

  if (survivorWillRename) {
    await sql`
      UPDATE departments
      SET name = ${NEW_NAME}
      WHERE id = ${survivor.id}
    `;
    console.log(`OK: renamed department id=${survivor.id} → "${NEW_NAME}"`);
  } else {
    console.log(`SKIP: survivor already named "${NEW_NAME}" (id=${survivor.id})`);
  }

  // Ensure survivor is active.
  await sql`
    UPDATE departments
    SET is_active = true
    WHERE id = ${survivor.id} AND is_active = false
  `;

  if (importation) {
    const moved = (await sql`
      UPDATE employees
      SET department_id = ${survivor.id}
      WHERE department_id = ${importation.id}
      RETURNING id
    `) as { id: number }[];
    console.log(
      `OK: moved ${moved.length} roster employee(s) from Importation → survivor`,
    );
  }

  // OT manual overrides: drop Importation rows that would collide with survivor key.
  if (importation || oldTextNames.includes(OLD_IMPORTATION)) {
    const deletedConflicts = (await sql`
      DELETE FROM ot_manual_overrides AS importation_row
      USING ot_manual_overrides AS survivor_row
      WHERE importation_row.company = ${COMPANY}
        AND importation_row.department = ${OLD_IMPORTATION}
        AND survivor_row.company = ${COMPANY}
        AND survivor_row.department IN (${OLD_FINANCE}, ${NEW_NAME})
        AND importation_row.employee_name = survivor_row.employee_name
        AND importation_row.payroll_group = survivor_row.payroll_group
        AND importation_row.period_start = survivor_row.period_start
        AND importation_row.period_end = survivor_row.period_end
      RETURNING importation_row.id AS id
    `) as { id: number }[];
    if (deletedConflicts.length > 0) {
      console.log(
        `OK: removed ${deletedConflicts.length} conflicting Importation OT manual override(s)`,
      );
    }
  }

  const rewrittenSlips = (await sql`
    UPDATE attendance_requests
    SET department = ${NEW_NAME}
    WHERE company = ${COMPANY}
      AND department = ANY(${oldTextNames})
    RETURNING id
  `) as { id: number }[];
  console.log(`OK: rewrote ${rewrittenSlips.length} slip(s)`);

  const rewrittenUsers = (await sql`
    UPDATE users
    SET department = ${NEW_NAME}
    WHERE company = ${COMPANY}
      AND department = ANY(${oldTextNames})
    RETURNING id, username, full_name, role
  `) as UserRow[];
  console.log(`OK: rewrote ${rewrittenUsers.length} user scope(s)`);
  for (const user of rewrittenUsers) {
    console.log(
      `    [${user.role}] ${user.full_name} (${user.username}) → ${NEW_NAME}`,
    );
  }

  const rewrittenOtManual = (await sql`
    UPDATE ot_manual_overrides
    SET department = ${NEW_NAME}
    WHERE company = ${COMPANY}
      AND department = ANY(${oldTextNames})
    RETURNING id
  `) as { id: number }[];
  console.log(`OK: rewrote ${rewrittenOtManual.length} OT manual override(s)`);

  const rewrittenOtBalance = (await sql`
    UPDATE ot_offset_balance_overrides
    SET department = ${NEW_NAME}
    WHERE company = ${COMPANY}
      AND department = ANY(${oldTextNames})
    RETURNING id
  `) as { id: number }[];
  console.log(
    `OK: rewrote ${rewrittenOtBalance.length} OT offset balance override(s)`,
  );

  const rewrittenLogs = (await sql`
    UPDATE record_request_logs
    SET department = ${NEW_NAME}
    WHERE company = ${COMPANY}
      AND department = ANY(${oldTextNames})
    RETURNING id
  `) as { id: number }[];
  console.log(`OK: rewrote ${rewrittenLogs.length} record request log(s)`);

  if (importation) {
    await sql`
      UPDATE departments
      SET is_active = false
      WHERE id = ${importation.id}
    `;
    console.log(`OK: deactivated Importation department id=${importation.id}`);
  } else {
    console.log("SKIP: Importation department not found");
  }

  const remainingOld = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM attendance_requests
      WHERE company = ${COMPANY}
        AND department = ANY(${[OLD_FINANCE, OLD_IMPORTATION]})
    `
  )[0] as CountRow | undefined;

  const newSlipCount = (
    await sql`
      SELECT COUNT(*)::int AS count
      FROM attendance_requests
      WHERE company = ${COMPANY}
        AND department = ${NEW_NAME}
    `
  )[0] as CountRow | undefined;

  const leftoverImportationEmployees = importation
    ? ((
        await sql`
          SELECT COUNT(*)::int AS count
          FROM employees
          WHERE department_id = ${importation.id}
        `
      ) as CountRow[])[0]?.count ?? 0
    : 0;

  console.log("After:");
  console.log(`  slips under "${NEW_NAME}": ${newSlipCount?.count ?? 0}`);
  console.log(
    `  slips still under Finance/Importation: ${remainingOld?.count ?? 0}`,
  );
  console.log(
    `  employees still on Importation dept id: ${leftoverImportationEmployees}`,
  );
  console.log(
    "NOTE: If two Manager accounts now share this department, disable or rescope the extra approver in Admin → Credentials.",
  );
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
