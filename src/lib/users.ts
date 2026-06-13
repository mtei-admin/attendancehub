import { asc, eq } from "drizzle-orm";
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

export async function listUsersByRole(role: string): Promise<User[]> {
  const db = getDb();
  return db
    .select()
    .from(users)
    .where(eq(users.role, role))
    .orderBy(asc(users.fullName));
}

export async function listAllUsers(): Promise<User[]> {
  const db = getDb();
  return db.select().from(users).orderBy(asc(users.role), asc(users.fullName));
}

export async function createUser(input: {
  username: string;
  password: string;
  fullName: string;
  role: string;
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
      fullName: input.fullName.trim(),
      role: input.role,
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
    department?: string | null;
    hrScope?: string | null;
    isActive?: boolean;
  },
): Promise<User | null> {
  const db = getDb();
  const updates: Partial<{
    username: string;
    passwordHash: string;
    fullName: string;
    role: string;
    department: string | null;
    hrScope: string | null;
    isActive: boolean;
  }> = {};

  if (input.username !== undefined) updates.username = input.username.trim();
  if (input.fullName !== undefined) updates.fullName = input.fullName.trim();
  if (input.role !== undefined) updates.role = input.role;
  if (input.department !== undefined) updates.department = input.department;
  if (input.hrScope !== undefined) updates.hrScope = input.hrScope;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  if (input.password) {
    updates.passwordHash = await hash(input.password, 10);
  }

  const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
  return user ?? null;
}
