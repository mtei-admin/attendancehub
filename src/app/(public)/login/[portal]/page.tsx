import { notFound, redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { isPortalSlug, type PortalSlug } from "@/lib/constants";

type LoginPageProps = {
  params: Promise<{ portal: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { portal } = await params;
  const query = await searchParams;

  if (!isPortalSlug(portal)) {
    notFound();
  }

  if (portal === "employee") {
    redirect("/employee");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <LoginForm portal={portal as PortalSlug} error={query.error} />
    </div>
  );
}
