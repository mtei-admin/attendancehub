import { NextRequest } from "next/server";

import { REQUEST_TYPES, STATUSES } from "@/lib/constants";
import { queryEmployeeRecords, recordsToCsv } from "@/lib/record-requests";
import { getEmployeeByPlacement } from "@/lib/roster";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const company = params.get("company")?.trim() ?? "";
  const department = params.get("department")?.trim() ?? "";
  const employeeName = params.get("employee_name")?.trim() ?? "";
  const submittedFrom = params.get("submitted_from")?.trim() ?? "";
  const submittedTo = params.get("submitted_to")?.trim() ?? "";
  const requestType = params.get("request_type")?.trim() ?? "";
  const status = params.get("status")?.trim() ?? "";

  if (!company || !department || !employeeName || !submittedFrom || !submittedTo) {
    return new Response("Missing required parameters.", { status: 400 });
  }

  if (submittedFrom > submittedTo) {
    return new Response("Invalid date range.", { status: 400 });
  }

  if (requestType && !(REQUEST_TYPES as readonly string[]).includes(requestType)) {
    return new Response("Invalid request type.", { status: 400 });
  }

  if (status && !(STATUSES as readonly string[]).includes(status)) {
    return new Response("Invalid status.", { status: 400 });
  }

  const employee = await getEmployeeByPlacement(company, department, employeeName);
  if (!employee) {
    return new Response("Employee not found.", { status: 404 });
  }

  const filters = {
    company,
    department,
    employeeName,
    submittedFrom,
    submittedTo,
    requestType: requestType || undefined,
    status: status || undefined,
  };

  const rows = await queryEmployeeRecords(filters);
  const csv = recordsToCsv(rows);
  const safeDate = submittedTo.replace(/-/g, "");
  const filename = `attendance_records_${safeDate}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
