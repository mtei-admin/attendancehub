import { asc, and, eq, ne, sql } from "drizzle-orm";
import { hash } from "bcryptjs";

import { getDb } from "./db";
import { users, type User } from "./schema";

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  return user;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function listUsersByRole(role: string, activeOnly = false): Promise<User[]> {
  const db = getDb();
  const condition = activeOnly
    ? and(eq(users.role, role), eq(users.isActive, true))
    : eq(users.role, role);

  return db.select().from(users).where(condition).orderBy(asc(users.fullName));
}

export async function listAllUsers(activeOnly = false): Promise<User[]> {
  const db = getDb();
  if (activeOnly) {
    return db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .orderBy(asc(users.role), asc(users.fullName));
  }

  return db.select().from(users).orderBy(asc(users.role), asc(users.fullName));
}

export async function deactivateUser(id: number): Promise<User | null> {
  return updateUser(id, { isActive: false });
}

export async function findPortalRoleConflict(
  fullName: string,
  company: string,
  role: "Manager" | "Verifier",
  excludeId?: number,
): Promise<User | undefined> {
  const conflictRole = role === "Manager" ? "Verifier" : "Manager";
  const db = getDb();
  const normalizedName = fullName.trim().toLowerCase();

  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.role, conflictRole),
        eq(users.isActive, true),
        eq(users.company, company),
        sql`lower(trim(${users.fullName})) = ${normalizedName}`,
        excludeId ? ne(users.id, excludeId) : undefined,
      ),
    )
    .limit(1);

  return rows[0];
}

export async function createUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: string;
  company?: string | null;
  department?: string | null;
  hrScope?: string | null;
}): Promise<User> {
  const db = getDb();
  const passwordHash = await hash(input.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      username: input.username.trim(),
      passwordHash,
      passwordHint: input.password,
      fullName: input.fullName.trim(),
      role: input.role,
      company: input.company ?? null,
      department: input.department ?? null,
      hrScope: input.hrScope ?? null,
      isActive: true,
    })
    .returning();

  return user;
}

export async function updateUser(
  id: number,
  input: {
    username?: string;
    password?: string;
    fullName?: string;
    role?: string;
    company?: string | null;
    department?: string | null;
    hrScope?: string | null;
    isActive?: boolean;
  },
): Promise<User | null> {
  const db = getDb();
  const updates: Partial<{
    username: string;
    passwordHash: string;
    passwordHint: string;
    fullName: string;
    role: string;
    company: string | null;
    department: string | null;
    hrScope: string | null;
    isActive: boolean;
  }> = {};

  if (input.username !== undefined) updates.username = input.username.trim();
  if (input.fullName !== undefined) updates.fullName = input.fullName.trim();
  if (input.role !== undefined) updates.role = input.role;
  if (input.company !== undefined) updates.company = input.company;
  if (input.department !== undefined) updates.department = input.department;
  if (input.hrScope !== undefined) updates.hrScope = input.hrScope;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  if (input.password) {
    updates.passwordHash = await hash(input.password, 10);
    updates.passwordHint = input.password;
  }

  const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  return user ?? null;
}
