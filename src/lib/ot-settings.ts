import { eq } from "drizzle-orm";

import { EMPLOYEE_TYPES, REQUEST_TYPES, type Role } from "./constants";
import { getDb } from "./db";
import { otEligibleRequestTypes, payrollCutoffRules, type PayrollCutoffRule } from "./schema";

export type OtEligibleTypeRow = {
  requestType: string;
  isActive: boolean;
};

export async function listPayrollCutoffRules(): Promise<PayrollCutoffRule[]> {
  const db = getDb();
  return db.select().from(payrollCutoffRules).orderBy(payrollCutoffRules.employeeType);
}

export async function getPayrollCutoffRule(employeeType: string): Promise<PayrollCutoffRule | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(payrollCutoffRules)
    .where(eq(payrollCutoffRules.employeeType, employeeType))
    .limit(1);
  return row ?? null;
}

export async function updatePayrollCutoffRule(
  employeeType: string,
  cutoffDay1: number,
  cutoffDay2: number,
): Promise<PayrollCutoffRule | null> {
  const db = getDb();
  const [row] = await db
    .update(payrollCutoffRules)
    .set({
      cutoffDay1,
      cutoffDay2,
      updatedAt: new Date(),
    })
    .where(eq(payrollCutoffRules.employeeType, employeeType))
    .returning();
  return row ?? null;
}

export async function listOtEligibleTypes(): Promise<OtEligibleTypeRow[]> {
  const db = getDb();
  const rows = await db.select().from(otEligibleRequestTypes);

  const byType = new Map(rows.map((row) => [row.requestType, row.isActive]));
  return REQUEST_TYPES.map((requestType) => ({
    requestType,
    isActive: byType.get(requestType) ?? false,
  }));
}

export async function getActiveOtEligibleTypes(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ requestType: otEligibleRequestTypes.requestType })
    .from(otEligibleRequestTypes)
    .where(eq(otEligibleRequestTypes.isActive, true));
  return rows.map((row) => row.requestType);
}

export async function saveOtEligibleTypes(activeTypes: string[]): Promise<void> {
  const db = getDb();
  const activeSet = new Set(activeTypes);

  for (const requestType of REQUEST_TYPES) {
    await db
      .insert(otEligibleRequestTypes)
      .values({ requestType, isActive: activeSet.has(requestType) })
      .onConflictDoUpdate({
        target: otEligibleRequestTypes.requestType,
        set: { isActive: activeSet.has(requestType) },
      });
  }
}

export function validateCutoffDays(cutoffDay1: number, cutoffDay2: number): string | null {
  if (!Number.isInteger(cutoffDay1) || !Number.isInteger(cutoffDay2)) {
    return "Cutoff days must be whole numbers.";
  }
  if (cutoffDay1 < 1 || cutoffDay1 > 31 || cutoffDay2 < 1 || cutoffDay2 > 31) {
    return "Cutoff days must be between 1 and 31.";
  }
  if (cutoffDay1 === cutoffDay2) {
    return "Cutoff days must be different.";
  }
  return null;
}

export function allowedPayrollGroups(role: Role, hrScope: string | null): string[] {
  if (role === "Payroll Officer") {
    return ["Rank & File", "Confi"];
  }

  if (hrScope === "R&F only") return ["Rank & File"];
  if (hrScope === "Confi only") return ["Confi"];
  return [...EMPLOYEE_TYPES];
}
