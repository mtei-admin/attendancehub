import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";
import { hrPortalScopeLabel } from "@/lib/roster";

export default async function HrPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/");

  const scopeLabel = hrPortalScopeLabel(session.hrScope);
  const title = scopeLabel ? `HR portal — ${scopeLabel}` : "HR portal";

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader title={title} userName={session.fullName} />
      {children}
    </div>
  );
}
