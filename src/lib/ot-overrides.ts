import { and, eq } from "drizzle-orm";

import { getDb } from "./db";
import { otManualOverrides, type OtManualOverride } from "./schema";

export type OtOverrideScope = {
  payrollGroup: string;
  periodStart: string;
  periodEnd: string;
  company?: string;
  department?: string;
  employeeName?: string;
};

export async function listOtManualOverrides(scope: OtOverrideScope): Promise<OtManualOverride[]> {
  const db = getDb();
  const conditions = [
    eq(otManualOverrides.payrollGroup, scope.payrollGroup),
    eq(otManualOverrides.periodStart, scope.periodStart),
    eq(otManualOverrides.periodEnd, scope.periodEnd),
  ];

  if (scope.company) {
    conditions.push(eq(otManualOverrides.company, scope.company));
  }
  if (scope.department) {
    conditions.push(eq(otManualOverrides.department, scope.department));
  }
  if (scope.employeeName) {
    conditions.push(eq(otManualOverrides.employeeName, scope.employeeName));
  }

  return db
    .select()
    .from(otManualOverrides)
    .where(and(...conditions));
}

export async function addOtManualOverrideHours(input: {
  company: string;
  department: string;
  employeeName: string;
  payrollGroup: string;
  periodStart: string;
  periodEnd: string;
  hoursToAdd: number;
  note: string;
  savedBy: string;
}): Promise<OtManualOverride> {
  const db = getDb();
  const hoursToAdd = input.hoursToAdd.toFixed(2);

  const [existing] = await db
    .select()
    .from(otManualOverrides)
    .where(
      and(
        eq(otManualOverrides.company, input.company),
        eq(otManualOverrides.department, input.department),
        eq(otManualOverrides.employeeName, input.employeeName),
        eq(otManualOverrides.payrollGroup, input.payrollGroup),
        eq(otManualOverrides.periodStart, input.periodStart),
        eq(otManualOverrides.periodEnd, input.periodEnd),
      ),
    )
    .limit(1);

  if (existing) {
    const currentHours = parseStoredOtOverrideHours(existing.hours);
    const newTotal = (currentHours + input.hoursToAdd).toFixed(2);
    const [updated] = await db
      .update(otManualOverrides)
      .set({
        hours: newTotal,
        note: input.note,
        updatedBy: input.savedBy,
        updatedAt: new Date(),
      })
      .where(eq(otManualOverrides.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(otManualOverrides)
    .values({
      company: input.company,
      department: input.department,
      employeeName: input.employeeName,
      payrollGroup: input.payrollGroup,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      hours: hoursToAdd,
      note: input.note,
      createdBy: input.savedBy,
      updatedBy: input.savedBy,
    })
    .returning();

  return created;
}

export function parseStoredOtOverrideHours(value: string | null): number {
  if (!value?.trim()) return 0;
  const parsed = Number.parseFloat(value.trim());
  return Number.isFinite(parsed) ? parsed : 0;
}
