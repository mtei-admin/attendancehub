import { redirect } from "next/navigation";

import { getSession } from "./auth";
import { type Role } from "./constants";

export function isNextNavigationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return false;
  }

  const digest = String((error as { digest?: string }).digest ?? "");
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}

export async function requireRoles(allowedRoles: Role[]) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  if (session.role !== "Admin" && !allowedRoles.includes(session.role)) {
    redirect(`/?error=${encodeURIComponent("You do not have access to that action.")}`);
  }

  return session;
}
