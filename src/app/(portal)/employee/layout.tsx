import Link from "next/link";

export default function EmployeePortalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Employee portal</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
