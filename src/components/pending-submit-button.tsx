"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  /** Shown while the parent form action is in flight. Defaults to children. */
  pendingLabel?: ReactNode;
  showSpinner?: boolean;
};

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Submit button that disables itself while the parent form's Server Action is pending.
 * Must be rendered inside a `<form>`.
 */
export function PendingSubmitButton({
  children,
  pendingLabel,
  showSpinner = true,
  className = "",
  disabled,
  ...rest
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || Boolean(disabled);

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={`${className} ${
        pending ? "pointer-events-none cursor-not-allowed opacity-70" : ""
      }`.trim()}
      {...rest}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          {showSpinner ? <Spinner /> : null}
          {pendingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
