import type { RecordRequestLog } from "@/lib/schema";

type RecordRequestLogsPanelProps = {
  logs: RecordRequestLog[];
};

function formatTimestamp(value: Date | null): string {
  if (!value) return "";
  return value.toISOString().slice(0, 19).replace("T", " ");
}

/** ~8 body rows visible; scroll for the rest. */
const SCROLL_VIEWPORT_CLASS = "max-h-[28rem] overflow-auto";

const COLUMNS = [
  { label: "When", className: "w-[12%]" },
  { label: "Action", className: "w-[7%]" },
  { label: "Employee", className: "w-[26%]" },
  { label: "Email / detail", className: "w-[14%]" },
  { label: "Submitted range", className: "w-[13%]" },
  { label: "Type", className: "w-[8%]" },
  { label: "Status", className: "w-[7%]" },
  { label: "Rows", className: "w-[4%]" },
  { label: "IP", className: "w-[9%]" },
] as const;

export function RecordRequestLogsPanel({ logs }: RecordRequestLogsPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Record request logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Audit trail when employees view, edit, or email their records. Shows about 8 rows at
          a time — scroll for all {logs.length} loaded entr{logs.length === 1 ? "y" : "ies"}.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={SCROLL_VIEWPORT_CLASS}>
          <table className="w-full table-fixed text-sm">
            <colgroup>
              {COLUMNS.map((column) => (
                <col key={column.label} className={column.className} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                    No record requests logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                        {log.action ?? "email"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-900">
                      <div className="truncate font-medium" title={log.employeeName}>
                        {log.employeeName}
                      </div>
                      <div
                        className="truncate text-xs text-slate-500"
                        title={`${log.company} · ${log.department}`}
                      >
                        {log.company} · {log.department}
                      </div>
                    </td>
                    <td className="truncate px-3 py-3 text-slate-700">
                      {log.action === "edit" && log.recordRefId
                        ? log.recordRefId
                        : log.emailSentTo || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                      {log.submittedFrom} – {log.submittedTo}
                    </td>
                    <td className="truncate px-3 py-3 text-slate-700">
                      {log.requestTypeFilter ?? "All"}
                    </td>
                    <td className="truncate px-3 py-3 text-slate-700">
                      {log.statusFilter ?? "All"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{log.rowCount}</td>
                    <td className="truncate px-3 py-3 text-slate-500">{log.ipAddress ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
