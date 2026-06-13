import { asc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { departments, type Department } from "./schema";

export async function listDepartments(activeOnly = false): Promise<Department[]> {
  const db = getDb();
  const rows = await db.select().from(departments).orderBy(asc(departments.name));

  if (activeOnly) {
    return rows.filter((row) => row.isActive);
  }

  return rows;
}

export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const db = getDb();
  const [row] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return row;
}

export async function createDepartment(name: string): Promise<Department> {
  const db = getDb();
  const [row] = await db
    .insert(departments)
    .values({ name: name.trim() })
    .returning();

  return row;
}

export async function updateDepartment(
  id: number,
  input: { name?: string; isActive?: boolean },
): Promise<Department | null> {
  const db = getDb();
  const [row] = await db
    .update(departments)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(departments.id, id))
    .returning();

  return row ?? null;
}
