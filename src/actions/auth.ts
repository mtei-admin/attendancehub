"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { isNextNavigationError } from "@/lib/action-auth";
import { isPortalSlug, type PortalSlug, type Role } from "@/lib/constants";
import { isRole, routeForRole } from "@/lib/role";

const PORTAL_EXPECTED_ROLE: Partial<Record<PortalSlug, Role>> = {
  manager: "Manager",
  verification: "Verifier",
  hr: "HR",
  admin: "Admin",
};

export async function loginAction(formData: FormData) {
  const portal = String(formData.get("portal") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isPortalSlug(portal)) {
    redirect("/?error=Invalid portal");
  }

  if (portal === "employee") {
    redirect("/employee");
  }

  const loginPath = `/login/${portal}`;

  if (!username || !password) {
    redirect(`${loginPath}?error=${encodeURIComponent("Username and password are required.")}`);
  }

  try {
    const user = await verifyCredentials(username, password);

    if (!user) {
      redirect(
        `${loginPath}?error=${encodeURIComponent("Invalid username or password.")}`,
      );
    }

    if (!isRole(user.role)) {
      redirect(
        `${loginPath}?error=${encodeURIComponent("Account role is not configured correctly.")}`,
      );
    }

    const expectedRole = PORTAL_EXPECTED_ROLE[portal];
    if (expectedRole && user.role !== expectedRole) {
      redirect(
        `${loginPath}?error=${encodeURIComponent("This account cannot sign in to this portal.")}`,
      );
    }

    await createSession(user);
    redirect(routeForRole(user.role));
  } catch (error) {
    if (isNextNavigationError(error)) throw error;
    redirect(
      `${loginPath}?error=${encodeURIComponent("Unable to sign in right now. Please try again.")}`,
    );
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
