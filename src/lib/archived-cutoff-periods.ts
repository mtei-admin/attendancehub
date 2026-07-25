import { and, desc, eq } from "drizzle-orm";

import { findCutoffPeriodForDate, type CutoffPeriod } from "./cutoff";
import { isDirectHrConfiOwnSlip } from "./direct-hr-confi-slips";
import { getDb } from "./db";
import type { AttendanceRequest, ArchivedCutoffPeriod, PayrollCutoffRule } from "./schema";
import { archivedCutoffPeriods } from "./schema";
import { requestEmployeeKey } from "./roster";

export type ArchivedCutoffPeriodKey = {
  payrollGroup: string;
  periodStart: string;
  periodEnd: string;
};

export function archivedCutoffPeriodKey(input: ArchivedCutoffPeriodKey): string {
  return `${input.payrollGroup}|${input.periodStart}|${input.periodEnd}`;
}

function resolvePayrollGroupForPeriodArchive(
  request: AttendanceRequest,
  employeeTypeLookup: Record<string, string>,
): string | undefined {
  if (isDirectHrConfiOwnSlip(request)) {
    return "Confi";
  }
  return employeeTypeLookup[requestEmployeeKey(request)];
}

export async function listArchivedCutoffPeriods(
  payrollGroup?: string,
): Promise<ArchivedCutoffPeriod[]> {
  const db = getDb();
  if (payrollGroup) {
    return db
      .select()
      .from(archivedCutoffPeriods)
      .where(eq(archivedCutoffPeriods.payrollGroup, payrollGroup))
      .orderBy(desc(archivedCutoffPeriods.periodEnd));
  }

  return db
    .select()
    .from(archivedCutoffPeriods)
    .orderBy(desc(archivedCutoffPeriods.periodEnd), desc(archivedCutoffPeriods.archivedAt));
}

export async function listArchivedCutoffPeriodKeys(): Promise<Set<string>> {
  const rows = await listArchivedCutoffPeriods();
  return new Set(
    rows.map((row) =>
      archivedCutoffPeriodKey({
        payrollGroup: row.payrollGroup,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
      }),
    ),
  );
}

export async function isCutoffPeriodArchived(
  input: ArchivedCutoffPeriodKey,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: archivedCutoffPeriods.id })
    .from(archivedCutoffPeriods)
    .where(
      and(
        eq(archivedCutoffPeriods.payrollGroup, input.payrollGroup),
        eq(archivedCutoffPeriods.periodStart, input.periodStart),
        eq(archivedCutoffPeriods.periodEnd, input.periodEnd),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function archiveCutoffPeriod(input: {
  payrollGroup: string;
  periodStart: string;
  periodEnd: string;
  archivedBy: string;
  note?: string;
}): Promise<ArchivedCutoffPeriod> {
  const db = getDb();
  const payrollGroup = input.payrollGroup.trim();
  const periodStart = input.periodStart.trim();
  const periodEnd = input.periodEnd.trim();

  if (payrollGroup !== "Confi" && payrollGroup !== "Rank & File") {
    throw new Error("Payroll group must be Confi or Rank & File.");
  }
  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    throw new Error("A valid cutoff period is required.");
  }

  const existing = await isCutoffPeriodArchived({ payrollGroup, periodStart, periodEnd });
  if (existing) {
    throw new Error("That cutoff period is already archived.");
  }

  const [created] = await db
    .insert(archivedCutoffPeriods)
    .values({
      payrollGroup,
      periodStart,
      periodEnd,
      archivedBy: input.archivedBy.trim(),
      note: input.note?.trim() || null,
    })
    .returning();

  return created;
}

export async function unarchiveCutoffPeriod(input: ArchivedCutoffPeriodKey): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(archivedCutoffPeriods)
    .where(
      and(
        eq(archivedCutoffPeriods.payrollGroup, input.payrollGroup),
        eq(archivedCutoffPeriods.periodStart, input.periodStart),
        eq(archivedCutoffPeriods.periodEnd, input.periodEnd),
      ),
    )
    .returning({ id: archivedCutoffPeriods.id });

  return deleted.length > 0;
}

export function buildCutoffRulesByEmployeeType(
  rules: PayrollCutoffRule[],
): Map<string, PayrollCutoffRule> {
  return new Map(rules.map((rule) => [rule.employeeType, rule]));
}

/**
 * Soft period-archive filter (Phase 1).
 * Does not use the HR-checked `archived` flag.
 * Slips with unknown payroll group / period are kept visible.
 */
export function filterRequestsExcludingArchivedCutoffPeriods(
  requests: AttendanceRequest[],
  options: {
    includeArchivedPeriods?: boolean;
    employeeTypeLookup: Record<string, string>;
    cutoffRulesByEmployeeType: Map<string, PayrollCutoffRule>;
    archivedPeriodKeys: Set<string>;
  },
): AttendanceRequest[] {
  if (options.includeArchivedPeriods || options.archivedPeriodKeys.size === 0) {
    return requests;
  }

  return requests.filter((request) => {
    const employeeType = resolvePayrollGroupForPeriodArchive(
      request,
      options.employeeTypeLookup,
    );
    if (employeeType !== "Confi" && employeeType !== "Rank & File") {
      return true;
    }

    const rule = options.cutoffRulesByEmployeeType.get(employeeType);
    if (!rule) {
      return true;
    }

    const period = findCutoffPeriodForDate(rule, request.dateOfIncident);
    if (!period) {
      return true;
    }

    const key = archivedCutoffPeriodKey({
      payrollGroup: employeeType,
      periodStart: period.startDate,
      periodEnd: period.endDate,
    });

    return !options.archivedPeriodKeys.has(key);
  });
}

export function formatArchivedCutoffPeriodLabel(row: ArchivedCutoffPeriod): string {
  return `${row.periodStart} – ${row.periodEnd}`;
}

export function closedCutoffPeriodsForArchive(
  periods: CutoffPeriod[],
  archivedKeys: Set<string>,
  todayIso = new Date().toISOString().slice(0, 10),
): CutoffPeriod[] {
  return periods.filter((period) => {
    if (period.endDate >= todayIso) return false;
    const key = archivedCutoffPeriodKey({
      payrollGroup: period.employeeType,
      periodStart: period.startDate,
      periodEnd: period.endDate,
    });
    return !archivedKeys.has(key);
  });
}
