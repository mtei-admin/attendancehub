import Link from "next/link";

export const metadata = {
  title: "Offline · AttendanceHub",
  description: "You are offline",
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
          AttendanceHub
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">You are offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          AttendanceHub needs an internet connection to load slips and submit requests. Reconnect,
          then try again.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
