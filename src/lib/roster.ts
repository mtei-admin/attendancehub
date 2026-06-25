import { and, asc, eq, ne } from "drizzle-orm";

import { getDb } from "./db";
import { departments, employees, type AttendanceRequest, type Employee } from "./schema";

export type EmployeeWithDepartment = Employee & {
  companyName: string;
  departmentName: string;
};

export type EmployeesByCompanyDepartment = Record<string, Record<string, string[]>>;

export function employeeLookupKey(
  company: string | null | undefined,
  department: string | null | undefined,
  employeeName: string,
): string {
  return `${company ?? ""}::${department ?? ""}::${employeeName}`;
}

export function requestEmployeeKey(request: {
  company?: string | null;
  department?: string | null;
  employeeName: string;
}): string {
  return employeeLookupKey(request.company, request.department, request.employeeName);
}

export async function listEmployees(activeOnly = false): Promise<EmployeeWithDepartment[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: employees.id,
      fullName: employees.fullName,
      departmentId: employees.departmentId,
      employeeType: employees.employeeType,
      email: employees.email,
      biometricNo: employees.biometricNo,
      isActive: employees.isActive,
      createdAt: employees.createdAt,
      companyName: departments.company,
      departmentName: departments.name,
      departmentIsActive: departments.isActive,
    })
    .from(employees)
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .orderBy(asc(departments.company), asc(departments.name), asc(employees.fullName));

  if (activeOnly) {
    return rows
      .filter((row) => row.isActive && row.departmentIsActive)
      .map(({ departmentIsActive: _ignored, ...row }) => row);
  }

  return rows.map(({ departmentIsActive: _ignored, ...row }) => row);
}

export function buildEmployeesByCompanyDepartment(
  roster: EmployeeWithDepartment[],
): EmployeesByCompanyDepartment {
  const grouped: EmployeesByCompanyDepartment = {};

  for (const employee of roster) {
    if (!grouped[employee.companyName]) {
      grouped[employee.companyName] = {};
    }
    if (!grouped[employee.companyName][employee.departmentName]) {
      grouped[employee.companyName][employee.departmentName] = [];
    }
    grouped[employee.companyName][employee.departmentName].push(employee.fullName);
  }

  return grouped;
}

export async function getEmployeesByCompanyDepartment(): Promise<EmployeesByCompanyDepartment> {
  return buildEmployeesByCompanyDepartment(await listEmployees(true));
}

export async function verifyEmployeePlacement(
  company: string,
  department: string,
  employeeName: string,
): Promise<boolean> {
  const roster = await listEmployees(true);
  return roster.some(
    (employee) =>
      employee.companyName === company &&
      employee.departmentName === department &&
      employee.fullName === employeeName,
  );
}

export function buildEmployeeTypeLookup(
  roster: EmployeeWithDepartment[],
): Record<string, string> {
  const lookup: Record<string, string> = {};

  for (const employee of roster) {
    lookup[employeeLookupKey(employee.companyName, employee.departmentName, employee.fullName)] =
      employee.employeeType;
  }

  return lookup;
}

export function filterRequestsByHrScope(
  requests: AttendanceRequest[],
  employeeTypeLookup: Record<string, string>,
  hrScope: string | null,
): AttendanceRequest[] {
  if (!hrScope) return requests;

  const allowedType =
    hrScope === "R&F only" ? "Rank & File" : hrScope === "Confi only" ? "Confi" : null;

  if (!allowedType) return requests;

  return requests.filter((request) => {
    const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
    return employeeType === allowedType;
  });
}

export function hrPortalScopeLabel(hrScope: string | null): string {
  if (hrScope === "Confi only") return "Confi";
  if (hrScope === "R&F only") return "R&F";
  return "";
}

export async function getEmployeeByPlacement(
  company: string,
  department: string,
  employeeName: string,
): Promise<EmployeeWithDepartment | null> {
  const roster = await listEmployees(true);
  return (
    roster.find(
      (employee) =>
        employee.companyName === company &&
        employee.departmentName === department &&
        employee.fullName === employeeName,
    ) ?? null
  );
}

export function buildEmployeeEmailLookup(
  roster: EmployeeWithDepartment[],
): Record<string, string | null> {
  const lookup: Record<string, string | null> = {};
  for (const employee of roster) {
    lookup[employeeLookupKey(employee.companyName, employee.departmentName, employee.fullName)] =
      employee.email;
  }
  return lookup;
}

export async function isBiometricNoTaken(
  biometricNo: number,
  excludeEmployeeId?: number,
): Promise<boolean> {
  const db = getDb();
  const conditions = excludeEmployeeId
    ? and(eq(employees.biometricNo, biometricNo), ne(employees.id, excludeEmployeeId))
    : eq(employees.biometricNo, biometricNo);

  const [row] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(conditions)
    .limit(1);

  return Boolean(row);
}

export async function createEmployee(input: {
  fullName: string;
  departmentId: number;
  employeeType: string;
  email?: string | null;
  biometricNo?: number | null;
}): Promise<Employee> {
  const db = getDb();
  const [row] = await db
    .insert(employees)
    .values({
      fullName: input.fullName.trim(),
      departmentId: input.departmentId,
      employeeType: input.employeeType,
      email: input.email?.trim() || null,
      biometricNo: input.biometricNo ?? null,
    })
    .returning();

  return row;
}

export async function updateEmployee(
  id: number,
  input: {
    fullName?: string;
    departmentId?: number;
    employeeType?: string;
    email?: string | null;
    biometricNo?: number | null;
    isActive?: boolean;
  },
): Promise<Employee | null> {
  const db = getDb();
  const [row] = await db
    .update(employees)
    .set({
      ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
      ...(input.departmentId !== undefined ? { departmentId: input.departmentId } : {}),
      ...(input.employeeType !== undefined ? { employeeType: input.employeeType } : {}),
      ...(input.email !== undefined ? { email: input.email?.trim() || null } : {}),
      ...(input.biometricNo !== undefined ? { biometricNo: input.biometricNo ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(employees.id, id))
    .returning();

  return row ?? null;
}
