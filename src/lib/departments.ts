import { and, asc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { departments, type Department } from "./schema";

export function listCompaniesFromDepartments(
  departmentRows: { company: string; isActive: boolean }[],
): string[] {
  const companies = new Set<string>();

  for (const row of departmentRows) {
    if (row.isActive) {
      companies.add(row.company);
    }
  }

  return Array.from(companies).sort();
}

export async function listDepartments(activeOnly = false): Promise<Department[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(departments)
    .orderBy(asc(departments.company), asc(departments.name));

  if (activeOnly) {
    return rows.filter((row) => row.isActive);
  }

  return rows;
}

export async function listCompanies(activeOnly = false): Promise<string[]> {
  const rows = await listDepartments(activeOnly);
  return listCompaniesFromDepartments(rows);
}

export async function getDepartmentById(id: number): Promise<Department | undefined> {
  const db = getDb();
  const [row] = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
  return row;
}

export async function getDepartmentByCompanyAndName(
  company: string,
  name: string,
): Promise<Department | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.company, company), eq(departments.name, name)))
    .limit(1);
  return row;
}

export async function createDepartment(input: {
  company: string;
  name: string;
}): Promise<Department> {
  const db = getDb();
  const [row] = await db
    .insert(departments)
    .values({
      company: input.company.trim(),
      name: input.name.trim(),
    })
    .returning();

  return row;
}

export async function updateDepartment(
  id: number,
  input: { company?: string; name?: string; isActive?: boolean },
): Promise<Department | null> {
  const db = getDb();
  const [row] = await db
    .update(departments)
    .set({
      ...(input.company !== undefined ? { company: input.company.trim() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(departments.id, id))
    .returning();

  return row ?? null;
}
