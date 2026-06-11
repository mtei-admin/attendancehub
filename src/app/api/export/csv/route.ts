import { getApprovedRequests, toDisplayRow } from "@/lib/requests";

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
  const approved = await getApprovedRequests();
  const csv = toCsv(approved.map(toDisplayRow));

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="approved_attendance_records.csv"',
    },
  });
}
