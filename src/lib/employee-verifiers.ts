import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "./db";
import { listEmployees, type EmployeeWithDepartment } from "./roster";
import { employeeVerifiers } from "./schema";
import { listUsersByRole } from "./users";
import type { User } from "./schema";

export const NO_VERIFIER_LABEL = "No Verifier";

export type VerifierOption = {
  id: number;
  fullName: string;
  username: string;
  company: string | null;
};

/** Active verifier accounts for a company (for roster checkboxes). */
export async function listActiveVerifiersForCompany(
  company: string,
): Promise<VerifierOption[]> {
  const verifiers = await listUsersByRole("Verifier", true);
  const normalized = company.trim().toLowerCase();
  return verifiers
    .filter((row) => (row.company ?? "").trim().toLowerCase() === normalized)
    .map((row) => ({
      id: row.id,
      fullName: row.fullName,
      username: row.username,
      company: row.company,
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export async function listVerifierUserIdsForEmployee(
  employeeId: number,
): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .select({ verifierUserId: employeeVerifiers.verifierUserId })
    .from(employeeVerifiers)
    .where(eq(employeeVerifiers.employeeId, employeeId));
  return rows.map((row) => row.verifierUserId);
}

export async function listVerifierAssignmentsByEmployeeIds(
  employeeIds: number[],
): Promise<Record<number, number[]>> {
  const result: Record<number, number[]> = {};
  if (employeeIds.length === 0) return result;

  const db = getDb();
  const rows = await db
    .select({
      employeeId: employeeVerifiers.employeeId,
      verifierUserId: employeeVerifiers.verifierUserId,
    })
    .from(employeeVerifiers)
    .where(inArray(employeeVerifiers.employeeId, employeeIds));

  for (const row of rows) {
    if (!result[row.employeeId]) result[row.employeeId] = [];
    result[row.employeeId].push(row.verifierUserId);
  }
  return result;
}

/**
 * Replace verifier assignments for an employee.
 * When skipVerification is true, clears all assignments.
 * Verifier IDs must belong to active Verifier users in the same company.
 */
export async function replaceEmployeeVerifierAssignments(input: {
  employeeId: number;
  company: string;
  skipVerification: boolean;
  verifierUserIds: number[];
}): Promise<void> {
  const db = getDb();

  await db
    .delete(employeeVerifiers)
    .where(eq(employeeVerifiers.employeeId, input.employeeId));

  if (input.skipVerification) {
    return;
  }

  const uniqueIds = Array.from(
    new Set(input.verifierUserIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (uniqueIds.length === 0) return;

  const allowed = await listActiveVerifiersForCompany(input.company);
  const allowedIds = new Set(allowed.map((row) => row.id));
  const validIds = uniqueIds.filter((id) => allowedIds.has(id));
  if (validIds.length === 0) return;

  await db.insert(employeeVerifiers).values(
    validIds.map((verifierUserId) => ({
      employeeId: input.employeeId,
      verifierUserId,
    })),
  );
}

/**
 * Policy B + assignments (PK-based):
 * - skip_verification employees are never in the verifier queue
 * - employees with zero assignment rows → visible to all company verifiers
 * - employees with assignment rows → only listed verifiers
 */
export async function listEmployeeIdsVisibleToVerifier(input: {
  verifierUserId: number;
  company: string;
}): Promise<{ employeeIds: number[]; employeeNames: string[] }> {
  const roster = await listEmployees(true);
  const companyEmployees = roster.filter(
    (row) => row.companyName.trim().toLowerCase() === input.company.trim().toLowerCase(),
  );

  const eligible = companyEmployees.filter((row) => !row.skipVerification);
  const assignments = await listVerifierAssignmentsByEmployeeIds(
    eligible.map((row) => row.id),
  );

  const visible: EmployeeWithDepartment[] = [];
  for (const employee of eligible) {
    const assigned = assignments[employee.id] ?? [];
    if (assigned.length === 0 || assigned.includes(input.verifierUserId)) {
      visible.push(employee);
    }
  }

  return {
    employeeIds: visible.map((row) => row.id),
    employeeNames: visible.map((row) => row.fullName),
  };
}

export function parseVerifierUserIdsFromFormData(formData: FormData): number[] {
  const raw = formData.getAll("verifier_user_ids");
  const ids: number[] = [];
  for (const value of raw) {
    const id = Number(value);
    if (Number.isInteger(id) && id > 0) ids.push(id);
  }
  return Array.from(new Set(ids));
}

export function toVerifierOptions(users: User[]): VerifierOption[] {
  return users
    .filter((row) => row.role === "Verifier" && row.isActive)
    .map((row) => ({
      id: row.id,
      fullName: row.fullName,
      username: row.username,
      company: row.company,
    }));
}
