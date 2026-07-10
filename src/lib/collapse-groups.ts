export const MANY_SLIPS_THRESHOLD = 3;

const STORAGE_PREFIX = "attendancehub-collapse:";

export function buildSectionId(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/[/|]/g, "_").trim())
    .filter(Boolean)
    .join("/");
}

/** Employees with fewer slips default open when their parent department is expanded. */
export function shouldAutoExpandEmployeeSection(itemCount: number): boolean {
  return itemCount < MANY_SLIPS_THRESHOLD;
}

export function loadExpandedIds(storageKey: string): Set<string> {
  if (typeof window === "undefined") {
    return new Set();
  }

  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${storageKey}`);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

export function saveExpandedIds(storageKey: string, expandedIds: Set<string>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(
      `${STORAGE_PREFIX}${storageKey}`,
      JSON.stringify(Array.from(expandedIds)),
    );
  } catch {
    // Ignore quota / private mode errors.
  }
}
