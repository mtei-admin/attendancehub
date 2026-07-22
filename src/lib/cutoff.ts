import type { PayrollCutoffRule } from "./schema";

export type CutoffPeriod = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  cutoffDay: number;
  employeeType: string;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatIsoDate(year: number, month: number, day: number): string {
  const clampedDay = Math.min(day, daysInMonth(year, month));
  return `${year}-${pad(month)}-${pad(clampedDay)}`;
}

function formatDisplay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export function buildCutoffPeriod(
  year: number,
  month: number,
  cutoffDay: number,
  day1: number,
  day2: number,
  employeeType: string,
): CutoffPeriod {
  let startDate: string;
  let endDate: string;

  if (cutoffDay === day2) {
    startDate = formatIsoDate(year, month, day1 + 1);
    endDate = formatIsoDate(year, month, day2);
  } else if (cutoffDay === day1) {
    endDate = formatIsoDate(year, month, day1);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startDay = day2 + 1;
    if (startDay <= daysInMonth(prevYear, prevMonth)) {
      startDate = formatIsoDate(prevYear, prevMonth, startDay);
    } else {
      startDate = formatIsoDate(year, month, 1);
    }
  } else {
    throw new Error(`Cutoff day ${cutoffDay} does not match configured days ${day1} or ${day2}.`);
  }

  const id = `${startDate}|${endDate}`;
  const label = `${formatDisplay(startDate)} – ${formatDisplay(endDate)} (cutoff ${cutoffDay})`;

  return { id, label, startDate, endDate, cutoffDay, employeeType };
}

export function listCutoffPeriods(
  rule: PayrollCutoffRule,
  options?: { around?: Date; count?: number },
): CutoffPeriod[] {
  const around = options?.around ?? new Date();
  const count = options?.count ?? 12;
  const day1 = rule.cutoffDay1;
  const day2 = rule.cutoffDay2;

  const periods: CutoffPeriod[] = [];
  const anchorYear = around.getFullYear();
  const anchorMonth = around.getMonth() + 1;

  for (let offset = -8; offset <= 2; offset += 1) {
    let month = anchorMonth + offset;
    let year = anchorYear;

    while (month < 1) {
      month += 12;
      year -= 1;
    }
    while (month > 12) {
      month -= 12;
      year += 1;
    }

    periods.push(buildCutoffPeriod(year, month, day1, day1, day2, rule.employeeType));
    periods.push(buildCutoffPeriod(year, month, day2, day1, day2, rule.employeeType));
  }

  const seen = new Set<string>();
  const unique = periods.filter((period) => {
    if (seen.has(period.id)) return false;
    seen.add(period.id);
    return true;
  });

  unique.sort((left, right) => right.endDate.localeCompare(left.endDate));
  return unique.slice(0, count);
}

export function getCurrentCutoffPeriod(
  rule: PayrollCutoffRule,
  refDate: Date = new Date(),
): CutoffPeriod | null {
  const iso = refDate.toISOString().slice(0, 10);
  return findCutoffPeriodForDate(rule, iso);
}

/** Earliest date_of_incident allowed for new employee slips (start of current cutoff). */
export function getEarliestAllowedIncidentDate(
  rule: PayrollCutoffRule | null | undefined,
  refDate: Date = new Date(),
): string | null {
  if (!rule) return null;
  return getCurrentCutoffPeriod(rule, refDate)?.startDate ?? null;
}

/** Most recent cutoff period whose end date is strictly before today (fully closed). */
export function getLastClosedCutoffPeriod(
  rule: PayrollCutoffRule,
  refDate: Date = new Date(),
): CutoffPeriod | null {
  const todayIso = refDate.toISOString().slice(0, 10);
  const periods = listCutoffPeriods(rule, { around: refDate, count: 16 });
  return periods.find((period) => period.endDate < todayIso) ?? null;
}

export function findCutoffPeriodForDate(
  rule: PayrollCutoffRule,
  dateIso: string,
): CutoffPeriod | null {
  const [yearPart, monthPart] = dateIso.split("-");
  const year = Number.parseInt(yearPart ?? "", 10);
  const month = Number.parseInt(monthPart ?? "", 10);

  if (!year || !month) {
    return null;
  }

  for (let offset = -3; offset <= 1; offset += 1) {
    let targetMonth = month + offset;
    let targetYear = year;

    while (targetMonth < 1) {
      targetMonth += 12;
      targetYear -= 1;
    }
    while (targetMonth > 12) {
      targetMonth -= 12;
      targetYear += 1;
    }

    for (const cutoffDay of [rule.cutoffDay2, rule.cutoffDay1]) {
      const period = buildCutoffPeriod(
        targetYear,
        targetMonth,
        cutoffDay,
        rule.cutoffDay1,
        rule.cutoffDay2,
        rule.employeeType,
      );

      if (isDateInPeriod(dateIso, period.startDate, period.endDate)) {
        return period;
      }
    }
  }

  return null;
}

export function parseCutoffPeriodId(periodId: string): { startDate: string; endDate: string } | null {
  const [startDate, endDate] = periodId.split("|");
  if (!startDate || !endDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }
  return { startDate, endDate };
}

export function isDateInPeriod(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}
