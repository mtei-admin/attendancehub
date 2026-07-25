import {
  archiveCutoffPeriodAction,
  unarchiveCutoffPeriodAction,
} from "@/actions/admin";
import {
  archivedCutoffPeriodKey,
  closedCutoffPeriodsForArchive,
  formatArchivedCutoffPeriodLabel,
} from "@/lib/archived-cutoff-periods";
import { listCutoffPeriods } from "@/lib/cutoff";
import type { ArchivedCutoffPeriod, PayrollCutoffRule } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";
import { PendingSubmitButton } from "./pending-submit-button";

type ArchivedCutoffPeriodsPanelProps = {
  cutoffRules: PayrollCutoffRule[];
  archivedPeriods: ArchivedCutoffPeriod[];
};

export function ArchivedCutoffPeriodsPanel({
  cutoffRules,
  archivedPeriods,
}: ArchivedCutoffPeriodsPanelProps) {
  const archivedKeys = new Set(
    archivedPeriods.map((row) =>
      archivedCutoffPeriodKey({
        payrollGroup: row.payrollGroup,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
      }),
    ),
  );

  const archiveOptions = cutoffRules.flatMap((rule) => {
    const periods = closedCutoffPeriodsForArchive(
      listCutoffPeriods(rule, { count: 12 }),
      archivedKeys,
    );
    return periods.map((period) => ({
      value: `${rule.employeeType}::${period.id}`,
      label: `${rule.employeeType} · ${period.label}`,
    }));
  });

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Archive cutoff periods</h3>
        <p className="mt-1 text-sm text-slate-500">
          Soft-archive closed cutoffs so their slips are hidden from default HR, Manager, and
          Verifier queues. Admin slips stay fully searchable. This is separate from HR Check
          (Checked).
        </p>
      </div>

      <form action={archiveCutoffPeriodAction} className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <FormField label="Closed cutoff to archive">
          <select name="period_choice" required className={inputClassName}>
            <option value="">— Select period —</option>
            {archiveOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Note (optional)">
          <input
            type="text"
            name="note"
            placeholder="Reason for archiving..."
            className={inputClassName}
          />
        </FormField>
        <div className="flex items-end">
          <PendingSubmitButton
            pendingLabel="Archiving…"
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Archive period
          </PendingSubmitButton>
        </div>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold text-slate-800">Archived periods</h4>
        {archivedPeriods.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No cutoff periods archived yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {archivedPeriods.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {row.payrollGroup} · {formatArchivedCutoffPeriodLabel(row)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Archived by {row.archivedBy}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <form action={unarchiveCutoffPeriodAction}>
                  <input type="hidden" name="payroll_group" value={row.payrollGroup} />
                  <input type="hidden" name="period_start" value={row.periodStart} />
                  <input type="hidden" name="period_end" value={row.periodEnd} />
                  <PendingSubmitButton
                    pendingLabel="Restoring…"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Unarchive
                  </PendingSubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
