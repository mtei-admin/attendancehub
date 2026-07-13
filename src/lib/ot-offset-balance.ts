import { and, eq } from "drizzle-orm";

import { getDb } from "./db";
import { parseOtHours } from "./ot-summary";
import { attendanceRequests, type AttendanceRequest } from "./schema";

export const OT_OFFSET_REQUEST_TYPE = "OT Offset";

export type TimeRangeParseResult = {
  totalHours: number;
  storedValue: string;
  valid: boolean;
  empty: boolean;
  error?: string;
};

function parseClockTime(value: string): { minutes: number; valid: boolean } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return { minutes: 0, valid: false };
  }

  const hours = Number.parseInt(match[1] ?? "", 10);
  const minutes = Number.parseInt(match[2] ?? "", 10);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { minutes: 0, valid: false };
  }

  return { minutes: hours * 60 + minutes, valid: true };
}

export function computeHoursFromTimeRange(
  timeIn: string | null | undefined,
  timeOut: string | null | undefined,
  options?: { required?: boolean },
): TimeRangeParseResult {
  const timeInValue = timeIn?.trim() ?? "";
  const timeOutValue = timeOut?.trim() ?? "";
  const empty = !timeInValue && !timeOutValue;

  if (empty) {
    if (options?.required) {
      return {
        totalHours: 0,
        storedValue: "",
        valid: false,
        empty: true,
        error: "From and To times are required.",
      };
    }

    return { totalHours: 0, storedValue: "", valid: true, empty: true };
  }

  if (!timeInValue || !timeOutValue) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "Both From and To times are required.",
    };
  }

  const from = parseClockTime(timeInValue);
  const to = parseClockTime(timeOutValue);

  if (!from.valid || !to.valid) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "Enter valid From and To times.",
    };
  }

  let durationMinutes = to.minutes - from.minutes;
  if (durationMinutes <= 0) {
    durationMinutes += 24 * 60;
  }

  if (durationMinutes <= 0) {
    return {
      totalHours: 0,
      storedValue: "",
      valid: false,
      empty: false,
      error: "To time must be after From time.",
    };
  }

  const totalHours = durationMinutes / 60;

  return {
    totalHours,
    storedValue: totalHours.toFixed(2),
    valid: true,
    empty: false,
  };
}

/** HR-confirmed hours stored on checked slips (`otHrs` after HR check). */
export function resolveHrConfirmedOtHours(request: AttendanceRequest): number {
  if (!request.archived || request.status !== "Approved") {
    return 0;
  }

  const { hours, valid } = parseOtHours(request.otHrs);
  return valid ? hours : 0;
}

export function resolveOtOffsetDebitHours(request: AttendanceRequest): number {
  if (
    request.requestType !== OT_OFFSET_REQUEST_TYPE ||
    !request.archived ||
    request.status !== "Approved"
  ) {
    return 0;
  }

  const stored = parseOtHours(request.otHrs);
  if (stored.valid && stored.hours > 0) {
    return stored.hours;
  }

  const fromTimes = computeHoursFromTimeRange(request.timeIn, request.timeOut);
  return fromTimes.valid ? fromTimes.totalHours : 0;
}

export function computeAvailableOtOffsetBalanceFromRecords(
  records: AttendanceRequest[],
  otEligibleTypes: readonly string[],
): number {
  const eligibleCreditTypes = new Set(
    otEligibleTypes.filter((type) => type !== OT_OFFSET_REQUEST_TYPE),
  );

  let balance = 0;

  for (const request of records) {
    if (request.status !== "Approved" || !request.archived) {
      continue;
    }

    if (request.requestType === OT_OFFSET_REQUEST_TYPE) {
      balance -= resolveOtOffsetDebitHours(request);
      continue;
    }

    if (eligibleCreditTypes.has(request.requestType)) {
      balance += resolveHrConfirmedOtHours(request);
    }
  }

  return Math.max(0, balance);
}

export type EmployeePlacement = {
  company: string;
  department: string;
  employeeName: string;
};

export function employeePlacementKey(placement: EmployeePlacement): string {
  return `${placement.company}|${placement.department}|${placement.employeeName}`;
}

export function resolveEmployeePlacement(request: AttendanceRequest): EmployeePlacement {
  return {
    company: request.company ?? "",
    department: request.department ?? "",
    employeeName: request.employeeName,
  };
}

export async function listEmployeeCheckedRequests(
  placement: EmployeePlacement,
): Promise<AttendanceRequest[]> {
  const db = getDb();

  return db
    .select()
    .from(attendanceRequests)
    .where(
      and(
        eq(attendanceRequests.company, placement.company),
        eq(attendanceRequests.department, placement.department),
        eq(attendanceRequests.employeeName, placement.employeeName),
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, true),
      ),
    );
}

export async function computeAvailableOtOffsetBalance(
  placement: EmployeePlacement,
  otEligibleTypes: readonly string[],
): Promise<number> {
  const records = await listEmployeeCheckedRequests(placement);
  return computeAvailableOtOffsetBalanceFromRecords(records, otEligibleTypes);
}

export async function listCheckedRequestsForPlacements(
  placements: EmployeePlacement[],
): Promise<AttendanceRequest[]> {
  const uniquePlacements = new Map<string, EmployeePlacement>();

  for (const placement of placements) {
    uniquePlacements.set(employeePlacementKey(placement), placement);
  }

  const results = await Promise.all(
    Array.from(uniquePlacements.values()).map((placement) =>
      listEmployeeCheckedRequests(placement),
    ),
  );

  return results.flat();
}

export function formatInsufficientOtOffsetBalanceMessage(
  availableHours: number,
  requestedHours: number,
): string {
  return `Insufficient OT offset balance. Available: ${availableHours.toFixed(2)} hrs, requested: ${requestedHours.toFixed(2)} hrs.`;
}
