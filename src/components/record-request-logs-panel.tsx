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

export function RecordRequestLogsPanel({ logs }: RecordRequestLogsPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Record request logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          Audit trail when employees view, edit, or email their records. Latest 8 entries in a
          scrollable panel.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className={SCROLL_VIEWPORT_CLASS}>
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "When",
                  "Action",
                  "Employee",
                  "Email / detail",
                  "Submitted range",
                  "Type",
                  "Status",
                  "Rows",
                  "IP",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {header}
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
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">
                        {log.action ?? "email"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900">
                      <div className="font-medium">{log.employeeName}</div>
                      <div className="text-xs text-slate-500">
                        {log.company} · {log.department}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {log.action === "edit" && log.recordRefId
                        ? log.recordRefId
                        : log.emailSentTo || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {log.submittedFrom} – {log.submittedTo}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{log.requestTypeFilter ?? "All"}</td>
                    <td className="px-4 py-3 text-slate-700">{log.statusFilter ?? "All"}</td>
                    <td className="px-4 py-3 text-slate-700">{log.rowCount}</td>
                    <td className="px-4 py-3 text-slate-500">{log.ipAddress ?? "—"}</td>
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
