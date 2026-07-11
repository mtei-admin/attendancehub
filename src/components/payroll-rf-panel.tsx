import { confirmPayrollCutoffAction } from "@/actions/hr";
import { HrRecordsList } from "@/components/hr-records-list";
import type { CutoffPeriod } from "@/lib/cutoff";
import type { AttendanceRequest } from "@/lib/schema";

type PayrollRfPanelProps = {
  requests: AttendanceRequest[];
  employeeTypeLookup: Record<string, string>;
  periodOptions: CutoffPeriod[];
  selectedPeriodId: string;
  selectedPeriodLabel: string;
};

const rfActionButtonClass =
  "inline-flex w-52 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold";

export function PayrollRfPanel({
  requests,
  employeeTypeLookup,
  periodOptions,
  selectedPeriodId,
  selectedPeriodLabel,
}: PayrollRfPanelProps) {
  const exportHref = `/api/export/csv?group=rf&period=${encodeURIComponent(selectedPeriodId)}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-900">R&F — HR checked</h2>
          <p className="text-sm text-slate-500">
            Rank &amp; File records checked by HR for the selected cutoff. Confirm payroll after
            export to flag them and hide from future cutoffs.
          </p>
          <form method="get" className="flex flex-wrap items-end gap-3 pt-1">
            <input type="hidden" name="tab" value="rf" />
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
          <p className="text-xs text-slate-500">Showing: {selectedPeriodLabel}</p>
        </div>

        <div className="flex flex-col gap-2">
          {requests.length > 0 && (
            <a
              href={exportHref}
              className={`${rfActionButtonClass} border border-brand-200 text-brand-600 hover:bg-brand-50`}
            >
              Export CSV
            </a>
          )}
          {requests.length > 0 ? (
            <form action={confirmPayrollCutoffAction}>
              <input type="hidden" name="period_id" value={selectedPeriodId} />
              <button
                type="submit"
                className={`${rfActionButtonClass} bg-brand-600 text-white hover:bg-brand-700`}
              >
                Confirm
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              className={`${rfActionButtonClass} cursor-not-allowed bg-slate-200 text-slate-500`}
            >
              Confirm
            </button>
          )}
        </div>
      </div>

      <HrRecordsList
        requests={requests}
        employeeTypeLookup={employeeTypeLookup}
        mode="checked"
        readOnly
        grouped
        collapseStorageKey={`hr:po:rf:checked:${selectedPeriodId}`}
        emptyMessage="No HR-checked R&F records for this cutoff, or this cutoff was already confirmed."
      />

      {requests.length > 0 && (
        <p className="text-xs text-slate-500">
          After payroll confirm, these records are flagged and will not appear in later cutoff
          views.
        </p>
      )}
    </section>
  );
}
