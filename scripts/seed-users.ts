import { hash } from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { DEFAULT_COMPANY } from "../src/lib/constants";
import { users } from "../src/lib/schema";

const USER_SAMPLES = [
  {
    username: "admin",
    password: "admin2026",
    fullName: "System Admin",
    role: "Admin",
    company: null,
    department: null,
    hrScope: null,
  },
  {
    username: "hr.manager",
    password: "hr2026",
    fullName: "Ana Reyes",
    role: "Manager",
    company: DEFAULT_COMPANY,
    department: "Human Resource",
    hrScope: null,
  },
  {
    username: "ops.manager",
    password: "ops2026",
    fullName: "Carlo Santos",
    role: "Manager",
    company: DEFAULT_COMPANY,
    department: "Operations",
    hrScope: null,
  },
  {
    username: "sales.manager",
    password: "sales2026",
    fullName: "Maria Lim",
    role: "Manager",
    company: DEFAULT_COMPANY,
    department: "Sales & Marketing",
    hrScope: null,
  },
  {
    username: "log.manager",
    password: "log2026",
    fullName: "Jose Cruz",
    role: "Manager",
    company: DEFAULT_COMPANY,
    department: "Logistics",
    hrScope: null,
  },
  {
    username: "virg",
    password: "rf2026",
    fullName: "Virg",
    role: "HR",
    company: null,
    department: null,
    hrScope: "R&F only",
  },
  {
    username: "hr.confi",
    password: "confi2026",
    fullName: "HR Confi",
    role: "HR",
    company: null,
    department: null,
    hrScope: "Confi only",
  },
  {
    username: "maria.santos",
    password: "emp2026",
    fullName: "Maria Santos",
    role: "Employee",
    company: null,
    department: "Operations",
    hrScope: null,
  },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed users.");
  }

  const db = drizzle(neon(url));

  for (const sample of USER_SAMPLES) {
    const passwordHash = await hash(sample.password, 10);

    await db
      .insert(users)
      .values({
        username: sample.username,
        passwordHash,
        passwordHint: sample.password,
        fullName: sample.fullName,
        role: sample.role,
        company: sample.company,
        department: sample.department,
        hrScope: sample.hrScope,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.username,
        set: {
          passwordHash,
          passwordHint: sample.password,
          fullName: sample.fullName,
          role: sample.role,
          company: sample.company,
          department: sample.department,
          hrScope: sample.hrScope,
          isActive: true,
        },
      });
  }

  console.log(`Seeded ${USER_SAMPLES.length} users.`);
  console.log("  Admin: admin / admin2026");
  console.log("  Managers: hr.manager, ops.manager, sales.manager, log.manager");
  console.log("  HR: virg, hr.confi");
  console.log("  Employee: maria.santos / emp2026");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
