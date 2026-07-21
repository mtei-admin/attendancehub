import { redirect } from "next/navigation";

import { PortalHeader } from "@/components/portal-header";
import { getSession } from "@/lib/auth";
import { isEmployeeOnlyManager } from "@/lib/manager-approval-scope";

export default async function ManagerPortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/");

  const title = isEmployeeOnlyManager(session.fullName)
    ? "Manager portal — limited approval scope"
    : `${session.department ?? "All Departments"} — Manager portal`;

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalHeader title={title} userName={session.fullName} />
      {children}
    </div>
  );
}
