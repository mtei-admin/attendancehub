import Link from "next/link";

import { logoutAction } from "@/actions/auth";

type PortalHeaderProps = {
  title: string;
  userName: string;
};

export function PortalHeader({ title, userName }: PortalHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Home
          </Link>
          <h1 className="text-base font-semibold text-slate-900 md:text-lg">{title}</h1>
          <span className="text-sm text-slate-400">Logged in as {userName}</span>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
