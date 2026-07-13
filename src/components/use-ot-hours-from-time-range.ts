"use client";

import { useEffect, useState } from "react";

import { parseOtHoursPartsFromTimeRange } from "@/lib/ot-hours";

export function useOtHoursFromTimeRange(
  timeIn: string,
  timeOut: string,
  enabled: boolean,
): {
  hours: string;
  minutes: string;
  storedValue: string;
  error: string | null;
  setHours: (value: string) => void;
  setMinutes: (value: string) => void;
} {
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [storedValue, setStoredValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setHours("");
      setMinutes("");
      setStoredValue("");
      setError(null);
      return;
    }

    if (!timeIn.trim() || !timeOut.trim()) {
      setHours("");
      setMinutes("");
      setStoredValue("");
      setError(null);
      return;
    }

    const parsed = parseOtHoursPartsFromTimeRange(timeIn, timeOut);
    if (!parsed.valid) {
      setHours("");
      setMinutes("");
      setStoredValue("");
      setError(parsed.error ?? "Invalid From/To times.");
      return;
    }

    setHours(parsed.hours);
    setMinutes(parsed.minutes);
    setStoredValue(parsed.storedValue);
    setError(null);
  }, [enabled, timeIn, timeOut]);

  return {
    hours,
    minutes,
    storedValue,
    error,
    setHours,
    setMinutes,
  };
}
