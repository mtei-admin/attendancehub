import { NextResponse } from "next/server";

import { promoteDueNoVerifierPreApprovedOt } from "@/lib/requests";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Allow Vercel Cron (sets Authorization: Bearer <CRON_SECRET> when configured).
    // Without a secret, refuse public calls in production.
    if (process.env.NODE_ENV !== "production") return true;
    return false;
  }

  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

/**
 * Daily promote for No-Verifier pre-approved OT that has reached incident date.
 * Also runs on manager/HR/verification/admin page loads as a backup.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const promoted = await promoteDueNoVerifierPreApprovedOt();
    return NextResponse.json({ ok: true, promoted });
  } catch (error) {
    console.error("[cron] promote-pre-approved-ot failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
