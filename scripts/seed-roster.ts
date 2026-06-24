import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { companies, departments, employees } from "../src/lib/schema";
import { resolveCompanyName, resolveDepartmentName } from "./roster-match";
import { ROSTER_SEED_DATA } from "./roster-seed-data";

function mapPayrollGroup(group: "CONFI" | "R&F"): string {
  return group === "CONFI" ? "Confi" : "Rank & File";
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed the employee roster.");
  }

  const db = drizzle(neon(url));

  const [companyRows, departmentRows] = await Promise.all([
    db.select().from(companies).where(eq(companies.isActive, true)),
    db.select().from(departments).where(eq(departments.isActive, true)),
  ]);

  if (companyRows.length === 0 || departmentRows.length === 0) {
    throw new Error("No active companies or departments found. Seed those first.");
  }

  const activeCompanyNames = companyRows.map((row) => row.name);
  const departmentsByCompany = new Map<string, typeof departmentRows>();

  for (const row of departmentRows) {
    const list = departmentsByCompany.get(row.company) ?? [];
    list.push(row);
    departmentsByCompany.set(row.company, list);
  }

  await db.delete(employees);
  console.log("OK: removed existing employee roster records");

  const employeeValues = [];
  const matchWarnings = new Set<string>();

  for (const row of ROSTER_SEED_DATA) {
    const resolvedCompany = resolveCompanyName(row.company, activeCompanyNames);
    if (resolvedCompany !== row.company) {
      matchWarnings.add(`Company "${row.company}" -> "${resolvedCompany}"`);
    }

    const companyDepartments = departmentsByCompany.get(resolvedCompany) ?? [];
    if (companyDepartments.length === 0) {
      throw new Error(`No departments found for company ${resolvedCompany}.`);
    }

    const departmentNames = companyDepartments.map((department) => department.name);
    const resolvedDepartment = resolveDepartmentName(row.department, departmentNames);
    if (resolvedDepartment !== row.department) {
      matchWarnings.add(
        `Department "${row.department}" -> "${resolvedDepartment}" (${resolvedCompany})`,
      );
    }

    const department = companyDepartments.find((item) => item.name === resolvedDepartment);
    if (!department) {
      throw new Error(
        `Unable to resolve department for ${row.fullName} (${resolvedCompany} · ${row.department}).`,
      );
    }

    employeeValues.push({
      fullName: row.fullName,
      departmentId: department.id,
      employeeType: mapPayrollGroup(row.payrollGroup),
      isActive: true,
    });
  }

  await db.insert(employees).values(employeeValues);

  if (matchWarnings.size > 0) {
    console.log(`WARN: applied ${matchWarnings.size} company/department fuzzy matches`);
    for (const warning of matchWarnings) {
      console.log(`  - ${warning}`);
    }
  }

  console.log(`OK: seeded ${employeeValues.length} employees`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
