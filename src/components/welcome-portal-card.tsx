import Link from "next/link";

import { PORTAL_CONFIG, type PortalSlug } from "@/lib/constants";

type WelcomePortalCardProps = {
  portal: PortalSlug;
};

export function WelcomePortalCard({ portal }: WelcomePortalCardProps) {
  const config = PORTAL_CONFIG[portal];

  const href = portal === "employee" ? "/employee" : `/login/${portal}`;

  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
    >
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border text-xl ${config.accent}`}
      >
        {config.icon}
      </div>
      <h2 className="text-lg font-semibold text-slate-900">
        {portal === "employee" && "Employee"}
        {portal === "manager" && "Manager"}
        {portal === "hr" && "HR"}
        {portal === "admin" && "IT / Admin"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">{config.description}</p>
    </Link>
  );
}
