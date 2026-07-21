import { asc, eq } from "drizzle-orm";

import { getDb } from "./db";
import { companies, type Company } from "./schema";

export async function listCompanies(activeOnly = false): Promise<Company[]> {
  const db = getDb();
  const rows = await db.select().from(companies).orderBy(asc(companies.name));

  if (activeOnly) {
    return rows.filter((row) => row.isActive);
  }

  return rows;
}

export async function listCompanyNames(activeOnly = false): Promise<string[]> {
  const rows = await listCompanies(activeOnly);
  return rows.map((row) => row.name);
}

export async function getCompanyById(id: number): Promise<Company | undefined> {
  const db = getDb();
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return row;
}

export async function getCompanyByName(name: string): Promise<Company | undefined> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(companies)
    .where(eq(companies.name, name.trim()))
    .limit(1);
  return row;
}

export async function isActiveCompany(name: string): Promise<boolean> {
  const company = await getCompanyByName(name);
  return Boolean(company?.isActive);
}

export async function createCompany(
  name: string,
  input?: { basecampWebhookUrl?: string | null },
): Promise<Company> {
  const db = getDb();
  const [row] = await db
    .insert(companies)
    .values({
      name: name.trim(),
      ...(input?.basecampWebhookUrl !== undefined
        ? { basecampWebhookUrl: input.basecampWebhookUrl }
        : {}),
    })
    .returning();

  return row;
}

export async function updateCompany(
  id: number,
  input: {
    name?: string;
    isActive?: boolean;
    basecampWebhookUrl?: string | null;
  },
): Promise<Company | null> {
  const db = getDb();
  const [row] = await db
    .update(companies)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.basecampWebhookUrl !== undefined
        ? { basecampWebhookUrl: input.basecampWebhookUrl }
        : {}),
    })
    .where(eq(companies.id, id))
    .returning();

  return row ?? null;
}
