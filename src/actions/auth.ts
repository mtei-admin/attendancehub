"use server";

import { redirect } from "next/navigation";

import { createSession, destroySession, verifyCredentials } from "@/lib/auth";
import { isPortalSlug, type PortalSlug } from "@/lib/constants";
import { isRole, routeForRole } from "@/lib/role";

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

    await createSession(user);
    redirect(routeForRole(user.role));
  } catch {
    redirect(
      `${loginPath}?error=${encodeURIComponent("Unable to sign in right now. Please try again.")}`,
    );
  }
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
