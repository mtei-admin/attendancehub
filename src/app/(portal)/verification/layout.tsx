import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";

export default async function VerificationPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/");

  const scopeLabel = session.department
    ? `${session.company} · ${session.department}`
    : session.company ?? "Company";
  const title = `${scopeLabel} — Verification portal`;

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader title={title} userName={session.fullName} />
      {children}
    </div>
  );
}
