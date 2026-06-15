import { compare } from "bcryptjs";
import { cookies } from "next/headers";

import { type Role } from "./constants";
import { isRole } from "./role";
import { getUserByUsername } from "./users";
import type { User } from "./schema";

export const SESSION_COOKIE = "attendancehub_session";

export type SessionUser = {
  userId: number;
  username: string;
  fullName: string;
  role: Role;
  company: string | null;
  department: string | null;
  hrScope: string | null;
};

export function userToSession(user: User): SessionUser {
  if (!isRole(user.role)) {
    throw new Error(`Invalid role stored for user ${user.username}`);
  }

  return {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    company: user.company,
    department: user.department,
    hrScope: user.hrScope,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(user: User): Promise<void> {
  const cookieStore = await cookies();
  const session = userToSession(user);

  cookieStore.set(SESSION_COOKIE, JSON.stringify(session), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
}

export async function verifyCredentials(
  username: string,
  password: string,
): Promise<User | null> {
  const user = await getUserByUsername(username.trim());
  if (!user || !user.isActive) return null;

  const valid = await compare(password, user.passwordHash);
  return valid ? user : null;
}

export function canAccessRoute(role: Role, pathname: string): boolean {
  if (role === "Admin") return true;

  const routeRoleMap: Record<string, Role> = {
    "/employee": "Employee",
    "/manager": "Manager",
    "/hr": "HR",
    "/admin": "Admin",
  };

  for (const [route, requiredRole] of Object.entries(routeRoleMap)) {
    if (pathname.startsWith(route)) {
      return role === requiredRole;
    }
  }

  return true;
}
