import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";
import { canAccessHrPortal, hrPortalTitle } from "@/lib/hr-portal-access";

export default async function HrPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session || !canAccessHrPortal(session.role)) redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader title={hrPortalTitle(session)} userName={session.fullName} />
      {children}
    </div>
  );
}
