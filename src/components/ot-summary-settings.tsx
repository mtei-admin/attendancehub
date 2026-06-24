import Link from "next/link";

import { REQUEST_TYPES } from "@/lib/constants";
import type { PayrollCutoffRule } from "@/lib/schema";

import { FormField, inputClassName } from "./form-field";

type OtSummarySettingsProps = {
  open: boolean;
  cutoffRules: PayrollCutoffRule[];
  eligibleTypes: { requestType: string; isActive: boolean }[];
  saveCutoffRulesAction: (formData: FormData) => Promise<void>;
  saveOtEligibleTypesAction: (formData: FormData) => Promise<void>;
};

export function OtSummarySettings({
  open,
  cutoffRules,
  eligibleTypes,
  saveCutoffRulesAction,
  saveOtEligibleTypesAction,
}: OtSummarySettingsProps) {
  if (!open) return null;

  const activeSet = new Set(eligibleTypes.filter((row) => row.isActive).map((row) => row.requestType));

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Cutoff &amp; OT settings</h3>
          <p className="mt-1 text-sm text-slate-500">
            Bi-monthly cutoff days per payroll group and which request types count toward OT summary.
          </p>
        </div>
        <Link href="/hr?tab=ot-summary" className="text-sm font-medium text-slate-500 hover:text-slate-700">
          Close
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-800">Payroll cutoff days</h4>
          {cutoffRules.map((rule) => (
            <form key={rule.employeeType} action={saveCutoffRulesAction} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <input type="hidden" name="employee_type" value={rule.employeeType} />
              <p className="text-sm font-medium text-slate-900">{rule.employeeType}</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Cutoff day 1">
                  <input
                    type="number"
                    name="cutoff_day_1"
                    min={1}
                    max={31}
                    defaultValue={rule.cutoffDay1}
                    required
                    className={inputClassName}
                  />
                </FormField>
                <FormField label="Cutoff day 2">
                  <input
                    type="number"
                    name="cutoff_day_2"
                    min={1}
                    max={31}
                    defaultValue={rule.cutoffDay2}
                    required
                    className={inputClassName}
                  />
                </FormField>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900"
              >
                Save {rule.employeeType}
              </button>
            </form>
          ))}
        </div>

        <form action={saveOtEligibleTypesAction} className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-800">OT-eligible request types</h4>
          <div className="space-y-2 rounded-lg border border-slate-200 p-4">
            {REQUEST_TYPES.map((requestType) => (
              <label key={requestType} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="eligible_types"
                  value={requestType}
                  defaultChecked={activeSet.has(requestType)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {requestType}
              </label>
            ))}
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Save OT-eligible types
          </button>
        </form>
      </div>
    </section>
  );
}
