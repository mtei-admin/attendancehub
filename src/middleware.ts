import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { type Role, ROLE_ROUTES } from "@/lib/constants";

const SESSION_COOKIE = "attendancehub_session";

type SessionUser = {
  role: Role;
};

function isRole(value: string): value is Role {
  return value in ROLE_ROUTES;
}

function getSession(request: NextRequest): SessionUser | null {
  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { role?: string };
    if (!parsed.role || !isRole(parsed.role)) return null;
    return { role: parsed.role };
  } catch {
    return null;
  }
}

function routeForRole(role: Role): string {
  return ROLE_ROUTES[role] ?? "/";
}

function canAccess(role: Role, pathname: string): boolean {
  if (role === "Admin") return true;

  const rules: Record<string, Role> = {
    "/employee": "Employee",
    "/manager": "Manager",
    "/verification": "Verifier",
    "/hr": "HR",
    "/admin": "Admin",
  };

  for (const [route, required] of Object.entries(rules)) {
    if (pathname.startsWith(route)) {
      return role === required;
    }
  }

  return true;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = getSession(request);

  if (pathname === "/login/employee" || pathname.startsWith("/login/employee/")) {
    return NextResponse.redirect(new URL("/employee", request.url));
  }

  if (pathname.startsWith("/employee")) {
    return NextResponse.next();
  }

  const isWelcomeOrLogin = pathname === "/" || pathname.startsWith("/login");

  if (isWelcomeOrLogin) {
    if (session) {
      return NextResponse.redirect(new URL(routeForRole(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccess(session.role, pathname)) {
    return NextResponse.redirect(new URL(routeForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
