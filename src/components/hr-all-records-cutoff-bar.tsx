import type { CutoffPeriod } from "@/lib/cutoff";

type HrAllRecordsCutoffBarProps = {
  periodOptions: CutoffPeriod[];
  selectedPeriodId: string;
  selectedPeriodLabel: string;
  filteredCount: number;
  exportHref: string;
};

export function HrAllRecordsCutoffBar({
  periodOptions,
  selectedPeriodId,
  selectedPeriodLabel,
  filteredCount,
  exportHref,
}: HrAllRecordsCutoffBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">All records</h2>
        <p className="text-sm text-slate-500">
          Filter by cutoff period. CSV export includes only records in the selected period
          (by date of incident).
        </p>
        <form method="get" className="flex flex-wrap items-end gap-3 pt-1">
          <input type="hidden" name="tab" value="all" />
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Cutoff period
            <select
              name="period"
              defaultValue={selectedPeriodId}
              className="mt-1 block min-w-[16rem] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {periodOptions.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Apply
          </button>
        </form>
        <p className="text-xs text-slate-500">
          Showing: {selectedPeriodLabel} · {filteredCount} record{filteredCount === 1 ? "" : "s"}
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
