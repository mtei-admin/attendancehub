import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { parseCutoffPeriodId } from "@/lib/cutoff";
import { allowedPayrollGroups, getPayrollCutoffRule } from "@/lib/ot-settings";
import { buildOtSummaryReport, otSummaryToCsv, type OtExportBasis } from "@/lib/ot-summary";
import { buildEmployeeTypeLookup, listEmployees } from "@/lib/roster";

function parseBasis(value: string | null): OtExportBasis {
  return value === "checked" ? "checked" : "approved";
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "HR") {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const payrollGroup = params.get("payroll_group")?.trim() ?? "";
  const exportBasis = parseBasis(params.get("basis"));
  const company = params.get("company")?.trim() || undefined;
  const department = params.get("department")?.trim() || undefined;
  const employeeName = params.get("employee")?.trim() || undefined;

  const allowedGroups = allowedPayrollGroups(session.hrScope);
  if (!payrollGroup || !allowedGroups.includes(payrollGroup)) {
    return new Response("Invalid payroll group.", { status: 400 });
  }

  let startDate = params.get("start")?.trim() ?? "";
  let endDate = params.get("end")?.trim() ?? "";

  if (!startDate || !endDate) {
    const periodId = params.get("period")?.trim() ?? "";
    const parsed = parseCutoffPeriodId(periodId);
    if (!parsed) {
      return new Response("Period or custom date range is required.", { status: 400 });
    }
    startDate = parsed.startDate;
    endDate = parsed.endDate;
  }

  if (startDate > endDate) {
    return new Response("Period start must be on or before period end.", { status: 400 });
  }

  const rule = await getPayrollCutoffRule(payrollGroup);
  if (!rule) {
    return new Response("Payroll cutoff rule not configured.", { status: 400 });
  }

  const roster = await listEmployees(true);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);

  const report = await buildOtSummaryReport({
    startDate,
    endDate,
    exportBasis,
    payrollGroup,
    company,
    department,
    employeeName,
    employeeTypeLookup,
    hrScope: session.hrScope,
  });

  const generatedAt = new Date().toISOString();
  const csv = otSummaryToCsv(report, {
    payrollGroup,
    startDate,
    endDate,
    exportBasis,
    generatedAt,
  });

  const safeEnd = endDate.replace(/-/g, "");
  const filename = `ot_summary_${payrollGroup.replace(/\s+/g, "_").toLowerCase()}_${safeEnd}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
