import Link from "next/link";

import { loginAction } from "@/actions/auth";
import { PORTAL_CONFIG, type PortalSlug } from "@/lib/constants";

import { FormField, inputClassName } from "./form-field";
import { PendingSubmitButton } from "./pending-submit-button";

type LoginFormProps = {
  portal: PortalSlug;
  error?: string;
};

export function LoginForm({ portal, error }: LoginFormProps) {
  const config = PORTAL_CONFIG[portal];

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <Link
        href="/"
        className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
      >
        ← Back
      </Link>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{config.title}</h1>
        <p className="mt-2 text-sm text-slate-500">{config.subtitle}</p>

        {error && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <form action={loginAction} className="mt-6 space-y-5">
          <input type="hidden" name="portal" value={portal} />

          <FormField label="Username">
            <input
              type="text"
              name="username"
              required
              autoComplete="username"
              placeholder="Enter username"
              className={inputClassName}
            />
          </FormField>

          <FormField label="Password">
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="Enter password"
              className={inputClassName}
            />
          </FormField>

          <PendingSubmitButton
            pendingLabel="Signing in…"
            className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Sign in
          </PendingSubmitButton>
        </form>
      </div>
    </div>
  );
}
