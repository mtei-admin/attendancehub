import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { parseCutoffPeriodId } from "@/lib/cutoff";
import {
  canAccessHrPortal,
  filterPayrollOfficerConfiRequests,
  filterPayrollOfficerRfRequests,
  filterRequestsForHrPortal,
  isPayrollOfficerRole,
} from "@/lib/hr-portal-access";
import { getAllApprovedRequests, getArchivedRequests, toDisplayRow } from "@/lib/requests";
import { buildEmployeeTypeLookup, listEmployees } from "@/lib/roster";

function toCsv(rows: ReturnType<typeof toDisplayRow>[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header as keyof typeof row] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    ),
  ];

  return lines.join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !canAccessHrPortal(session.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const group = request.nextUrl.searchParams.get("group")?.trim() ?? "";
  const periodId = request.nextUrl.searchParams.get("period")?.trim() ?? "";

  const [roster, approved, archived] = await Promise.all([
    listEmployees(true),
    getAllApprovedRequests(),
    getArchivedRequests(),
  ]);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);

  let scoped = filterRequestsForHrPortal(approved, employeeTypeLookup, session, "all");

  if (isPayrollOfficerRole(session.role) && group === "rf") {
    const parsedPeriod = parseCutoffPeriodId(periodId);
    if (!parsedPeriod) {
      return new Response("Invalid cutoff period.", { status: 400 });
    }

    scoped = filterPayrollOfficerRfRequests(
      archived,
      employeeTypeLookup,
      parsedPeriod.startDate,
      parsedPeriod.endDate,
    );
  } else if (isPayrollOfficerRole(session.role) && group === "confi") {
    scoped = filterPayrollOfficerConfiRequests(approved, employeeTypeLookup, "all");
  }

  const csv = toCsv(scoped.map(toDisplayRow));
  const safePeriod = periodId.replace(/[^\d|]/g, "").slice(0, 24);
  const filename =
    group === "rf" && safePeriod
      ? `rf_payroll_${safePeriod.replace("|", "_to_")}.csv`
      : "approved_attendance_records.csv";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
