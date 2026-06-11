import { cookies } from "next/headers";

import { ROLE_ROUTES, ROLES, type Role } from "./constants";

const ROLE_COOKIE = "attendancehub_role";

export function isRole(value: string): value is Role {
  return ROLES.includes(value as Role);
}

export async function getRole(): Promise<Role> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ROLE_COOKIE)?.value;
  return value && isRole(value) ? value : "Employee";
}

export async function setRole(role: Role): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE, role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function routeForRole(role: Role): string {
  return ROLE_ROUTES[role];
}
