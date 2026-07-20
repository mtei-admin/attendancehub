import { and, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "./db";
import {
  employeePlacementKey,
  OT_OFFSET_REQUEST_TYPE,
  resolveEmployeePlacement,
  type EmployeePlacement,
} from "./ot-offset-balance";
import { parseOtHours } from "./ot-summary";
import { attendanceRequests, type AttendanceRequest } from "./schema";

function toDateIso(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function otClaimCreditTypes(otEligibleTypes: readonly string[]): string[] {
  return otEligibleTypes.filter((type) => type !== OT_OFFSET_REQUEST_TYPE);
}

/** HR-checked OT / Holiday hours within an incident-date period. */
export function sumHrCheckedOtClaimedInPeriod(
  records: AttendanceRequest[],
  startDate: string,
  endDate: string,
  otEligibleTypes: readonly string[],
): number {
  const creditTypes = new Set(otClaimCreditTypes(otEligibleTypes));
  if (creditTypes.size === 0) return 0;

  let total = 0;
  for (const request of records) {
    if (request.status !== "Approved" || !request.archived) continue;
    if (!creditTypes.has(request.requestType)) continue;

    const incidentDate = toDateIso(request.dateOfIncident);
    if (!incidentDate || incidentDate < startDate || incidentDate > endDate) continue;

    const parsed = parseOtHours(request.otHrs);
    if (parsed.valid) total += parsed.hours;
  }

  return total;
}

export type OtClaimedListRow = EmployeePlacement & {
  claimedHours: number;
};

/** Rank & File roster rows with HR-checked OT claimed in the given cutoff period. */
export async function listOtClaimedHoursByPayrollGroup(input: {
  payrollGroup: string;
  roster: Array<{
    companyName: string;
    departmentName: string;
    fullName: string;
    employeeType: string;
  }>;
  otEligibleTypes: readonly string[];
  startDate: string;
  endDate: string;
}): Promise<OtClaimedListRow[]> {
  const employees = input.roster.filter(
    (employee) => employee.employeeType === input.payrollGroup,
  );

  if (employees.length === 0) {
    return [];
  }

  const creditTypes = otClaimCreditTypes(input.otEligibleTypes);
  if (creditTypes.length === 0) {
    return employees.map((employee) => ({
      company: employee.companyName,
      department: employee.departmentName,
      employeeName: employee.fullName,
      claimedHours: 0,
    }));
  }

  const db = getDb();
  const checkedRows = await db
    .select()
    .from(attendanceRequests)
    .where(
      and(
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, true),
        inArray(attendanceRequests.requestType, creditTypes),
        gte(attendanceRequests.dateOfIncident, input.startDate),
        lte(attendanceRequests.dateOfIncident, input.endDate),
      ),
    );

  const recordsByEmployee = new Map<string, AttendanceRequest[]>();
  for (const request of checkedRows) {
    const key = employeePlacementKey(resolveEmployeePlacement(request));
    const existing = recordsByEmployee.get(key);
    if (existing) {
      existing.push(request);
    } else {
      recordsByEmployee.set(key, [request]);
    }
  }

  const rows: OtClaimedListRow[] = employees.map((employee) => {
    const placement: EmployeePlacement = {
      company: employee.companyName,
      department: employee.departmentName,
      employeeName: employee.fullName,
    };
    const records = recordsByEmployee.get(employeePlacementKey(placement)) ?? [];
    return {
      ...placement,
      claimedHours: sumHrCheckedOtClaimedInPeriod(
        records,
        input.startDate,
        input.endDate,
        input.otEligibleTypes,
      ),
    };
  });

  rows.sort(
    (left, right) =>
      right.claimedHours - left.claimedHours ||
      left.employeeName.localeCompare(right.employeeName) ||
      left.company.localeCompare(right.company) ||
      left.department.localeCompare(right.department),
  );

  return rows;
}

export async function computeOtClaimedHoursForPlacement(
  placement: EmployeePlacement,
  startDate: string,
  endDate: string,
  otEligibleTypes: readonly string[],
): Promise<number> {
  const creditTypes = otClaimCreditTypes(otEligibleTypes);
  if (creditTypes.length === 0) return 0;

  const db = getDb();
  const rows = await db
    .select()
    .from(attendanceRequests)
    .where(
      and(
        eq(attendanceRequests.company, placement.company),
        eq(attendanceRequests.department, placement.department),
        eq(attendanceRequests.employeeName, placement.employeeName),
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, true),
        inArray(attendanceRequests.requestType, creditTypes),
        gte(attendanceRequests.dateOfIncident, startDate),
        lte(attendanceRequests.dateOfIncident, endDate),
      ),
    );

  return sumHrCheckedOtClaimedInPeriod(rows, startDate, endDate, otEligibleTypes);
}
