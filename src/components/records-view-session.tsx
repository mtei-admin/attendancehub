"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  formatRecordsExpiryTime,
  isRecordsViewExpired,
  recordsViewSessionKey,
  RECORDS_VIEW_TTL_MS,
} from "@/lib/records-view-session";
import type { RecordRequestFilters } from "@/lib/record-requests";

type RecordsViewSessionProps = {
  filters: RecordRequestFilters;
  viewedAt: number;
  editRefId?: string;
  children: ReactNode;
};

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;
const CHECK_INTERVAL_MS = 15_000;

function readStoredActivity(sessionKey: string, viewedAt: number): number {
  if (typeof window === "undefined") return viewedAt;
  const stored = sessionStorage.getItem(sessionKey);
  if (!stored) return viewedAt;
  const parsed = Number.parseInt(stored, 10);
  return Number.isFinite(parsed) ? Math.max(parsed, viewedAt) : viewedAt;
}

function writeStoredActivity(sessionKey: string, timestamp: number) {
  sessionStorage.setItem(sessionKey, String(timestamp));
}

function clearStoredActivity(sessionKey: string) {
  sessionStorage.removeItem(sessionKey);
}

export function RecordsViewSession({
  filters,
  viewedAt,
  editRefId,
  children,
}: RecordsViewSessionProps) {
  const router = useRouter();
  const sessionKey = recordsViewSessionKey(filters);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isActive, setIsActive] = useState(() => {
    const lastActivity = readStoredActivity(sessionKey, viewedAt);
    return !isRecordsViewExpired(lastActivity);
  });

  const [lastActivity, setLastActivity] = useState(() =>
    readStoredActivity(sessionKey, viewedAt),
  );

  const expireSession = useCallback(() => {
    clearStoredActivity(sessionKey);
    setIsActive(false);
    const params = new URLSearchParams({ section: "records" });
    params.set(
      "error",
      "Your record results expired after 5 minutes of inactivity. Click View records to load them again.",
    );
    router.replace(`/employee?${params.toString()}`);
  }, [router, sessionKey]);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    writeStoredActivity(sessionKey, now);
    setLastActivity(now);
    setIsActive(true);
  }, [sessionKey]);

  useEffect(() => {
    if (!isActive) return;

    const handleActivity = () => resetActivity();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    const interval = window.setInterval(() => {
      const stored = readStoredActivity(sessionKey, viewedAt);
      if (isRecordsViewExpired(stored)) {
        expireSession();
      } else {
        setLastActivity(stored);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      window.clearInterval(interval);
    };
  }, [expireSession, isActive, resetActivity, sessionKey, viewedAt]);

  useEffect(() => {
    if (editRefId) {
      resetActivity();
    }
  }, [editRefId, resetActivity]);

  useEffect(() => {
    const last = readStoredActivity(sessionKey, viewedAt);
    if (isRecordsViewExpired(last)) {
      expireSession();
      return;
    }
    setLastActivity(last);
    setIsActive(true);
  }, [expireSession, sessionKey, viewedAt]);

  if (!isActive) {
    return null;
  }

  const expiryLabel = formatRecordsExpiryTime(lastActivity);
  const idleMinutes = Math.round(RECORDS_VIEW_TTL_MS / 60_000);

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-medium">Record results are visible in this session.</p>
        <p className="mt-1 text-sky-800">
          Hides after <strong>{idleMinutes} minutes</strong> of inactivity · active until{" "}
          <strong>{expiryLabel}</strong>
          {editRefId ? " · timer reset while editing" : ""}
        </p>
      </div>
      {children}
    </div>
  );
}
