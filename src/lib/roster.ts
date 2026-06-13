import { asc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { departments, employees, type Employee } from "./schema";

export type EmployeeWithDepartment = Employee & { departmentName: string };

export async function listEmployees(activeOnly = false): Promise<EmployeeWithDepartment[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      departmentId: employees.departmentId,
      isActive: employees.isActive,
      createdAt: employees.createdAt,
      departmentName: departments.name,
      departmentIsActive: departments.isActive,
    })
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(asc(departments.name), asc(employees.fullName));

  if (activeOnly) {
    return rows
      .filter((row) => row.isActive && row.departmentIsActive)
      .map(({ departmentIsActive: _ignored, ...row }) => row);
  }

  return rows.map(({ departmentIsActive: _ignored, ...row }) => row);
}

export async function getEmployeesByDepartment(): Promise<Record<string, string[]>> {
  const roster = await listEmployees(true);
  const grouped: Record<string, string[]> = {};

  for (const employee of roster) {
    if (!grouped[employee.departmentName]) {
      grouped[employee.departmentName] = [];
    }
    grouped[employee.departmentName].push(employee.fullName);
  }

  return grouped;
}

export async function createEmployee(input: {
  fullName: string;
  departmentId: number;
}): Promise<Employee> {
  const db = getDb();
  const [row] = await db
    .insert(employees)
    .values({
      fullName: input.fullName.trim(),
      departmentId: input.departmentId,
    })
    .returning();

  return row;
}

export async function updateEmployee(
  id: number,
  input: { fullName?: string; departmentId?: number; isActive?: boolean },
): Promise<Employee | null> {
  const db = getDb();
  const [row] = await db
    .update(employees)
    .set({
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(employees.id, id))
    .returning();

  return row ?? null;
}
