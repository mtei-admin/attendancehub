type HrPayrollDateRangeBarProps = {
  title: string;
  tab: "checked" | "all";
  fromDate: string;
  toDate: string;
  filteredCount: number;
  exportHref: string;
};

export function HrPayrollDateRangeBar({
  title,
  tab,
  fromDate,
  toDate,
  filteredCount,
  exportHref,
}: HrPayrollDateRangeBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">
          Filter by date of incident. CSV export includes only records in the selected range.
        </p>
        <form method="get" className="flex flex-wrap items-end gap-3 pt-1">
          <input type="hidden" name="tab" value={tab} />
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            From
            <input
              type="date"
              name="from"
              required
              defaultValue={fromDate}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            To
            <input
              type="date"
              name="to"
              required
              defaultValue={toDate}
              className="mt-1 block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Apply
          </button>
        </form>
        <p className="text-xs text-slate-500">
          Showing: {fromDate} – {toDate} · {filteredCount} record
          {filteredCount === 1 ? "" : "s"}
        </p>
      </div>

      {filteredCount > 0 && (
        <a
          href={exportHref}
          className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Download CSV for Payroll
        </a>
      )}
    </div>
  );
}
