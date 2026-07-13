import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";

import { getDb } from "./db";
import { getActiveOtEligibleTypes } from "./ot-settings";
import { listOtManualOverrides, listOtManualOverridesLifetime, parseStoredOtOverrideHours } from "./ot-overrides";
import { resolveEmployeeTypeForHr } from "./hr-portal-access";
import { requestEmployeeKey } from "./roster";
import { attendanceRequests, type AttendanceRequest } from "./schema";

export type OtExportBasis = "approved" | "checked";

export type OtSummaryDetailRow = {
  refId: string;
  company: string;
  department: string;
  employeeName: string;
  employeeType: string;
  requestType: string;
  dateOfIncident: string;
  otHrs: number;
  otHrsRaw: string;
  otHrsValid: boolean;
  status: string;
  hrChecked: boolean;
  approvedBy: string;
  approvedOn: string;
  isManualOverride?: boolean;
};

export type OtSummaryRollup = {
  key: string;
  label: string;
  requestCount: number;
  totalHours: number;
};

export type OtSummaryReport = {
  details: OtSummaryDetailRow[];
  byEmployee: OtSummaryRollup[];
  byDepartment: OtSummaryRollup[];
  byCompany: OtSummaryRollup[];
  grandTotalHours: number;
  grandTotalRequests: number;
  invalidOtWarnings: string[];
};

export type BuildOtSummaryParams = {
  startDate: string;
  endDate: string;
  exportBasis: OtExportBasis;
  payrollGroup?: string;
  company?: string;
  department?: string;
  employeeName?: string;
  employeeTypeLookup: Record<string, string>;
  hrScope?: string | null;
};

export type BuildOtLifetimeHoursParams = Omit<
  BuildOtSummaryParams,
  "startDate" | "endDate" | "exportBasis"
>;

export function parseOtHours(value: string | null): { hours: number; valid: boolean } {
  if (!value?.trim()) {
    return { hours: 0, valid: true };
  }

  const parsed = Number.parseFloat(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { hours: 0, valid: false };
  }

  return { hours: parsed, valid: true };
}

function matchesHrScope(
  request: AttendanceRequest,
  employeeTypeLookup: Record<string, string>,
  hrScope: string | null | undefined,
): boolean {
  if (!hrScope) return true;

  const allowedType =
    hrScope === "R&F only" ? "Rank & File" : hrScope === "Confi only" ? "Confi" : null;
  if (!allowedType) return true;

  const employeeType = resolveEmployeeTypeForHr(request, employeeTypeLookup) ?? "Unknown";
  return employeeType === allowedType;
}

function matchesPayrollGroup(
  request: AttendanceRequest,
  payrollGroup: string | undefined,
  employeeTypeLookup: Record<string, string>,
): boolean {
  if (!payrollGroup) return true;
  const employeeType = resolveEmployeeTypeForHr(request, employeeTypeLookup) ?? "Unknown";
  return employeeType === payrollGroup;
}

function toDetailRow(
  request: AttendanceRequest,
  employeeTypeLookup: Record<string, string>,
): OtSummaryDetailRow {
  const parsed = parseOtHours(request.otHrs);
  const employeeType = resolveEmployeeTypeForHr(request, employeeTypeLookup) ?? "Unknown";

  return {
    refId: request.refId,
    company: request.company ?? "",
    department: request.department ?? "",
    employeeName: request.employeeName,
    employeeType,
    requestType: request.requestType,
    dateOfIncident: request.dateOfIncident,
    otHrs: parsed.hours,
    otHrsRaw: request.otHrs ?? "",
    otHrsValid: parsed.valid,
    status: request.status,
    hrChecked: request.archived,
    approvedBy: request.approvedBy ?? "",
    approvedOn: request.approvedOn ? request.approvedOn.toISOString() : "",
  };
}

function buildRollups(details: OtSummaryDetailRow[]): {
  byEmployee: OtSummaryRollup[];
  byDepartment: OtSummaryRollup[];
  byCompany: OtSummaryRollup[];
} {
  const employeeMap = new Map<string, OtSummaryRollup>();
  const departmentMap = new Map<string, OtSummaryRollup>();
  const companyMap = new Map<string, OtSummaryRollup>();

  for (const row of details) {
    const employeeKey = requestEmployeeKey(row);
    const departmentKey = `${row.company}::${row.department}`;
    const companyKey = row.company || "Unknown";

    for (const [map, key, label] of [
      [employeeMap, employeeKey, row.employeeName] as const,
      [departmentMap, departmentKey, `${row.company} / ${row.department}`] as const,
      [companyMap, companyKey, row.company || "Unknown"] as const,
    ]) {
      const existing = map.get(key);
      if (existing) {
        existing.requestCount += 1;
        existing.totalHours += row.otHrs;
      } else {
        map.set(key, { key, label, requestCount: 1, totalHours: row.otHrs });
      }
    }
  }

  const sortRollups = (rows: OtSummaryRollup[]) =>
    rows.sort((left, right) => right.totalHours - left.totalHours || left.label.localeCompare(right.label));

  return {
    byEmployee: sortRollups([...employeeMap.values()]),
    byDepartment: sortRollups([...departmentMap.values()]),
    byCompany: sortRollups([...companyMap.values()]),
  };
}

export async function buildOtSummaryReport(params: BuildOtSummaryParams): Promise<OtSummaryReport> {
  const eligibleTypes = await getActiveOtEligibleTypes();
  if (eligibleTypes.length === 0) {
    return {
      details: [],
      byEmployee: [],
      byDepartment: [],
      byCompany: [],
      grandTotalHours: 0,
      grandTotalRequests: 0,
      invalidOtWarnings: [],
    };
  }

  const db = getDb();
  const conditions = [
    eq(attendanceRequests.status, "Approved"),
    gte(attendanceRequests.dateOfIncident, params.startDate),
    lte(attendanceRequests.dateOfIncident, params.endDate),
    inArray(attendanceRequests.requestType, eligibleTypes),
  ];

  if (params.exportBasis === "checked") {
    conditions.push(eq(attendanceRequests.archived, true));
  }

  const rows = await db
    .select()
    .from(attendanceRequests)
    .where(and(...conditions))
    .orderBy(
      asc(attendanceRequests.company),
      asc(attendanceRequests.department),
      asc(attendanceRequests.employeeName),
      asc(attendanceRequests.dateOfIncident),
    );

  const filtered = rows.filter((request) => {
    if (!matchesHrScope(request, params.employeeTypeLookup, params.hrScope)) return false;
    if (!matchesPayrollGroup(request, params.payrollGroup, params.employeeTypeLookup)) return false;
    if (params.company && request.company !== params.company) return false;
    if (params.department && request.department !== params.department) return false;
    if (params.employeeName && request.employeeName !== params.employeeName) return false;
    return true;
  });

  const details = filtered.map((request) => toDetailRow(request, params.employeeTypeLookup));
  let mergedDetails = [...details];

  if (params.exportBasis === "checked" && params.payrollGroup === "Confi") {
    const overrides = await listOtManualOverrides({
      payrollGroup: "Confi",
      periodStart: params.startDate,
      periodEnd: params.endDate,
      company: params.company,
      department: params.department,
      employeeName: params.employeeName,
    });

    const manualRows = overrides.flatMap((override) => {
      const hours = parseStoredOtOverrideHours(override.hours);
      if (hours === 0) return [];

      return [
        {
          refId: `OT-OVERRIDE-${String(override.id).padStart(3, "0")}`,
          company: override.company,
          department: override.department,
          employeeName: override.employeeName,
          employeeType: "Confi",
          requestType: hours > 0 ? "Manual override (Add)" : "Manual adjustment (Deduct)",
          dateOfIncident: params.endDate,
          otHrs: hours,
          otHrsRaw: override.hours,
          otHrsValid: true,
          status: "Override",
          hrChecked: true,
          approvedBy: override.updatedBy,
          approvedOn: override.updatedAt?.toISOString() ?? "",
          isManualOverride: true,
        } satisfies OtSummaryDetailRow,
      ];
    });

    mergedDetails = [...details, ...manualRows];
  }

  const invalidOtWarnings = mergedDetails
    .filter((row) => !row.otHrsValid && !row.isManualOverride)
    .map((row) => `${row.refId} (${row.employeeName}): invalid OT hours "${row.otHrsRaw}"`);

  const rollups = buildRollups(mergedDetails);
  const grandTotalHours = mergedDetails.reduce((sum, row) => sum + row.otHrs, 0);

  return {
    details: mergedDetails,
    ...rollups,
    grandTotalHours,
    grandTotalRequests: mergedDetails.length,
    invalidOtWarnings,
  };
}

/** HR-checked OT hours across all periods for the selected filters (ignores cutoff dates). */
export async function buildOtLifetimeHoursTotal(
  params: BuildOtLifetimeHoursParams,
): Promise<number> {
  const eligibleTypes = await getActiveOtEligibleTypes();
  if (eligibleTypes.length === 0) {
    return 0;
  }

  const db = getDb();
  const rows = await db
    .select()
    .from(attendanceRequests)
    .where(
      and(
        eq(attendanceRequests.status, "Approved"),
        eq(attendanceRequests.archived, true),
        inArray(attendanceRequests.requestType, eligibleTypes),
      ),
    );

  const filtered = rows.filter((request) => {
    if (!matchesHrScope(request, params.employeeTypeLookup, params.hrScope)) return false;
    if (!matchesPayrollGroup(request, params.payrollGroup, params.employeeTypeLookup)) return false;
    if (params.company && request.company !== params.company) return false;
    if (params.department && request.department !== params.department) return false;
    if (params.employeeName && request.employeeName !== params.employeeName) return false;
    return true;
  });

  let totalHours = filtered.reduce((sum, request) => {
    const parsed = parseOtHours(request.otHrs);
    return sum + (parsed.valid ? parsed.hours : 0);
  }, 0);

  if (params.payrollGroup === "Confi") {
    const overrides = await listOtManualOverridesLifetime({
      payrollGroup: "Confi",
      company: params.company,
      department: params.department,
      employeeName: params.employeeName,
    });

    totalHours += overrides.reduce(
      (sum, override) => sum + parseStoredOtOverrideHours(override.hours),
      0,
    );
  }

  return totalHours;
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",");
}

export function otSummaryToCsv(
  report: OtSummaryReport,
  meta: {
    payrollGroup: string;
    startDate: string;
    endDate: string;
    exportBasis: OtExportBasis;
    generatedAt: string;
  },
): string {
  const lines: string[] = [];

  lines.push("OT SUMMARY EXPORT");
  lines.push(csvRow(["Payroll group", meta.payrollGroup]));
  lines.push(csvRow(["Period start", meta.startDate]));
  lines.push(csvRow(["Period end", meta.endDate]));
  lines.push(csvRow(["Export basis", meta.exportBasis === "checked" ? "HR-checked (official)" : "Manager-approved"]));
  lines.push(csvRow(["Generated at", meta.generatedAt]));
  lines.push("");

  lines.push("DETAIL");
  lines.push(
    csvRow([
      "Ref ID",
      "Company",
      "Department",
      "Employee",
      "Employee type",
      "Request type",
      "Date of incident",
      "OT hours",
      "Source",
      "HR checked",
      "Approved by",
      "Approved on",
    ]),
  );

  for (const row of report.details) {
    lines.push(
      csvRow([
        row.refId,
        row.company,
        row.department,
        row.employeeName,
        row.employeeType,
        row.requestType,
        row.dateOfIncident,
        row.otHrs.toFixed(2),
        row.isManualOverride ? "Manual override" : "Slip",
        row.hrChecked ? "Yes" : "No",
        row.approvedBy,
        row.approvedOn,
      ]),
    );
  }

  lines.push("");
  lines.push("SUMMARY BY EMPLOYEE");
  lines.push(csvRow(["Employee", "Requests", "Total OT hours"]));
  for (const row of report.byEmployee) {
    lines.push(csvRow([row.label, row.requestCount, row.totalHours.toFixed(2)]));
  }

  lines.push("");
  lines.push("SUMMARY BY DEPARTMENT");
  lines.push(csvRow(["Department", "Requests", "Total OT hours"]));
  for (const row of report.byDepartment) {
    lines.push(csvRow([row.label, row.requestCount, row.totalHours.toFixed(2)]));
  }

  lines.push("");
  lines.push("SUMMARY BY COMPANY");
  lines.push(csvRow(["Company", "Requests", "Total OT hours"]));
  for (const row of report.byCompany) {
    lines.push(csvRow([row.label, row.requestCount, row.totalHours.toFixed(2)]));
  }

  lines.push("");
  lines.push("GRAND TOTAL");
  lines.push(csvRow(["Total requests", report.grandTotalRequests]));
  lines.push(csvRow(["Total OT hours", report.grandTotalHours.toFixed(2)]));

  return lines.join("\n");
}
