import { randomInt } from "crypto";

import { and, eq, isNotNull, ne, sql } from "drizzle-orm";

import { getDb } from "./db";
import { employees } from "./schema";

export const EMPLOYEE_ACCESS_CODE_LENGTH = 6;
export const EMPLOYEE_ACCESS_CODE_MIN = 100000;
export const EMPLOYEE_ACCESS_CODE_MAX = 999999;

/** Revealable 6-digit My Records PIN (Admin/HR can see and reset). */
export function isValidEmployeeAccessCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

export function parseEmployeeAccessCode(raw: string): {
  value: string | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }
  if (!isValidEmployeeAccessCode(trimmed)) {
    return { value: null, error: "Access code must be exactly 6 digits." };
  }
  return { value: trimmed };
}

export function generateEmployeeAccessCode(): string {
  return String(randomInt(EMPLOYEE_ACCESS_CODE_MIN, EMPLOYEE_ACCESS_CODE_MAX + 1));
}

export async function listUsedAccessCodes(excludeEmployeeId?: number): Promise<Set<string>> {
  const db = getDb();
  const conditions = excludeEmployeeId
    ? and(isNotNull(employees.accessCode), ne(employees.id, excludeEmployeeId))
    : isNotNull(employees.accessCode);

  const rows = await db
    .select({ accessCode: employees.accessCode })
    .from(employees)
    .where(conditions);

  return new Set(
    rows
      .map((row) => row.accessCode?.trim() ?? "")
      .filter((code) => Boolean(code)),
  );
}

export async function generateUniqueEmployeeAccessCode(
  excludeEmployeeId?: number,
  maxAttempts = 40,
): Promise<string> {
  const used = await listUsedAccessCodes(excludeEmployeeId);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = generateEmployeeAccessCode();
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("Unable to generate a unique access code. Please try again.");
}

export async function isAccessCodeTaken(
  accessCode: string,
  excludeEmployeeId?: number,
): Promise<boolean> {
  const db = getDb();
  const conditions = excludeEmployeeId
    ? and(eq(employees.accessCode, accessCode), ne(employees.id, excludeEmployeeId))
    : eq(employees.accessCode, accessCode);

  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(conditions)
    .limit(1);

  return Boolean(row);
}

export async function backfillMissingActiveEmployeeAccessCodes(): Promise<number> {
  const db = getDb();
  const missing = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        sql`(${employees.accessCode} IS NULL OR ${employees.accessCode} = '')`,
      ),
    );

  let updated = 0;
  for (const row of missing) {
    const accessCode = await generateUniqueEmployeeAccessCode(row.id);
    await db
      .update(employees)
      .set({ accessCode })
      .where(eq(employees.id, row.id));
    updated += 1;
  }
  return updated;
}
