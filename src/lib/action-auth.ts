import { redirect } from "next/navigation";

import { getSession } from "./auth";
import { type Role } from "./constants";

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
