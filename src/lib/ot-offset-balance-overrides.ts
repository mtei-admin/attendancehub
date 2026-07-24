import { and, eq } from "drizzle-orm";

import { getDb } from "./db";
import {
  otOffsetBalanceOverrides,
  type OtOffsetBalanceOverride,
} from "./schema";

export type OtOffsetBalanceOverrideScope = {
  company: string;
  department: string;
  employeeName: string;
};

export function parseStoredOffsetBalanceOverrideHours(value: string | null): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listOtOffsetBalanceOverrides(
  scope: OtOffsetBalanceOverrideScope,
): Promise<OtOffsetBalanceOverride[]> {
  const db = getDb();
  return db
    .select()
    .from(otOffsetBalanceOverrides)
    .where(
      and(
        eq(otOffsetBalanceOverrides.company, scope.company.trim()),
        eq(otOffsetBalanceOverrides.department, scope.department.trim()),
        eq(otOffsetBalanceOverrides.employeeName, scope.employeeName.trim()),
      ),
    );
}

export async function sumOtOffsetBalanceOverrideHours(
  scope: OtOffsetBalanceOverrideScope,
): Promise<number> {
  const rows = await listOtOffsetBalanceOverrides(scope);
  return rows.reduce(
    (sum, row) => sum + parseStoredOffsetBalanceOverrideHours(row.hours),
    0,
  );
}

/** Batch sum of lifetime offset-balance overrides keyed by company|department|employee. */
export async function sumOtOffsetBalanceOverridesByPlacement(): Promise<Map<string, number>> {
  const db = getDb();
  const rows = await db.select().from(otOffsetBalanceOverrides);
  const totals = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.company}|${row.department}|${row.employeeName}`;
    const hours = parseStoredOffsetBalanceOverrideHours(row.hours);
    totals.set(key, (totals.get(key) ?? 0) + hours);
  }

  return totals;
}

export async function addOtOffsetBalanceOverrideHours(input: {
  company: string;
  department: string;
  employeeName: string;
  hoursToAdd: number;
  note: string;
  savedBy: string;
}): Promise<OtOffsetBalanceOverride> {
  const db = getDb();
  const [created] = await db
    .insert(otOffsetBalanceOverrides)
    .values({
      company: input.company.trim(),
      department: input.department.trim(),
      employeeName: input.employeeName.trim(),
      hours: input.hoursToAdd.toFixed(2),
      note: input.note.trim(),
      createdBy: input.savedBy.trim(),
    })
    .returning();

  return created;
}
