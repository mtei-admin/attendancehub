"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  cancelHref?: string;
  onClose?: () => void;
  title: string;
  titleId: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
};

export function FormModal({
  open,
  cancelHref,
  onClose,
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
        if (onClose) {
          onClose();
        } else if (cancelHref) {
          router.push(cancelHref);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, cancelHref, onClose, router]);

  if (!open) return null;

  function handleBackdropClose() {
    if (onClose) {
      onClose();
      return;
    }
    if (cancelHref) {
      router.push(cancelHref);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={handleBackdropClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
          size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-lg" : "max-w-md"
        }`}
      >
        <h3
          id={titleId}
          className="shrink-0 border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-900"
        >
          {title}
        </h3>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
