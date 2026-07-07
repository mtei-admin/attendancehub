import { WelcomePortalCard } from "@/components/welcome-portal-card";
import { PORTAL_SLUGS } from "@/lib/constants";

type WelcomePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            ■ Attendance Management System
          </p>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900 md:text-5xl">Welcome</h1>
          <p className="mt-3 text-slate-500">Select your portal to get started.</p>
        </div>

        {params.error && (
          <div className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
            {params.error}
          </div>
        )}

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PORTAL_SLUGS.map((portal) => (
            <WelcomePortalCard key={portal} portal={portal} />
          ))}
        </div>
      </div>
    </div>
  );
}
