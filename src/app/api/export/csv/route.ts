import { getSession } from "@/lib/auth";
import { canAccessHrPortal, filterRequestsForHrPortal } from "@/lib/hr-portal-access";
import { getAllApprovedRequests, toDisplayRow } from "@/lib/requests";
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

export async function GET() {
  const session = await getSession();
  if (!session || !canAccessHrPortal(session.role)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [approved, roster] = await Promise.all([getAllApprovedRequests(), listEmployees(true)]);
  const employeeTypeLookup = buildEmployeeTypeLookup(roster);
  const scoped = filterRequestsForHrPortal(approved, employeeTypeLookup, session, "all");
  const csv = toCsv(scoped.map(toDisplayRow));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="approved_attendance_records.csv"',
    },
  });
}
