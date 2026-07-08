import type { RecordRequestFilters } from "./record-requests";

export const RECORDS_VIEW_TTL_MS = 5 * 60 * 1000;

export function recordsViewSessionKey(filters: RecordRequestFilters): string {
  return [
    filters.company,
    filters.department,
    filters.employeeName,
    filters.submittedFrom,
    filters.submittedTo,
    filters.requestType ?? "",
    filters.status ?? "",
  ].join("|");
}

export function parseViewedAt(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function isRecordsViewExpired(lastActivityMs: number, now = Date.now()): boolean {
  return now - lastActivityMs >= RECORDS_VIEW_TTL_MS;
}

export function formatRecordsExpiryTime(lastActivityMs: number): string {
  const expiresAt = new Date(lastActivityMs + RECORDS_VIEW_TTL_MS);
  return expiresAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildRecordsViewSearchParams(
  filters: RecordRequestFilters,
  viewedAt: number,
  extra?: Record<string, string | undefined>,
): URLSearchParams {
  const params = new URLSearchParams({
    section: "records",
    view: "1",
    company: filters.company,
    department: filters.department,
    employee_name: filters.employeeName,
    submitted_from: filters.submittedFrom,
    submitted_to: filters.submittedTo,
    viewed_at: String(viewedAt),
  });

  if (filters.requestType) params.set("request_type", filters.requestType);
  if (filters.status) params.set("status", filters.status);

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }

  return params;
}
