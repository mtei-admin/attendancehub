import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";

export default async function AdminPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader title="IT / Admin portal" userName={session.fullName} />
      {children}
    </div>
  );
}
