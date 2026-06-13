"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  cancelHref: string;
  title: string;
  titleId: string;
  children: ReactNode;
  size?: "md" | "lg";
};

export function FormModal({
  open,
  cancelHref,
  title,
  titleId,
  children,
  size = "md",
}: FormModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(cancelHref);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, cancelHref, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => router.push(cancelHref)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full rounded-xl border border-slate-200 bg-white p-6 shadow-xl ${
          size === "lg" ? "max-w-lg" : "max-w-md"
        }`}
      >
        <h3 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
