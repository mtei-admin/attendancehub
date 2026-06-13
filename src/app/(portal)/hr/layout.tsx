import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";

export default async function HrPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/");

  const scopeLabel = session.hrScope ? ` (${session.hrScope})` : "";

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader
        title={`Human Resource — HR portal${scopeLabel}`}
        userName={session.fullName}
      />
      {children}
    </div>
  );
}
