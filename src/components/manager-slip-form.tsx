"use client";

import { useState } from "react";

import { submitManagerSlipAction } from "@/actions/manager";
import { REQUEST_TYPES } from "@/lib/constants";

import { FormField, inputClassName } from "./form-field";

type ManagerSlipFormProps = {
  company: string;
  department: string;
  employeeName: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ManagerSlipForm({ company, department, employeeName }: ManagerSlipFormProps) {
  const [requestType, setRequestType] = useState("");

  const isSimpleLayout =
    requestType === "Absent/Leave" || requestType === "OT Offset";
  const isOtOrHolidayWork =
    requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
  const showTimeFields = !isSimpleLayout;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5 md:px-8">
          <h2 className="text-lg font-semibold text-slate-900">File a slip</h2>
          <p className="mt-1 text-sm text-slate-500">
            File <strong>your own</strong> attendance slip only. Verification and manager approval
            are skipped — the request goes straight to <strong>HR Confi Pending</strong> for checking.
            Slips filed for other employees follow the normal approval workflow.
          </p>
        </div>

        <form action={submitManagerSlipAction} className="space-y-5 p-6 md:p-8">
          <div className="rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-900">
            Filing as <strong>{employeeName}</strong> · {company} · {department}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Date requested">
              <input
                type="date"
                name="date_requested"
                defaultValue={todayIso()}
                required
                className={inputClassName}
              />
            </FormField>

            <FormField label="Request type">
              <select
                name="request_type"
                required
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
                className={inputClassName}
              >
                <option value="">— Select type —</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Date of application" className="md:col-span-2">
              <input
                type="date"
                name="date_of_incident"
                defaultValue={todayIso()}
                required
                className={inputClassName}
              />
            </FormField>

            {showTimeFields && (
              <>
                <FormField label="Actual time in">
                  <input type="time" name="time_in" className={inputClassName} />
                </FormField>

                <FormField label="Actual time out">
                  <input type="time" name="time_out" className={inputClassName} />
                </FormField>
              </>
            )}

            {isOtOrHolidayWork && (
              <>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="file_as_ot_offset"
                      className="rounded border-slate-300 text-brand-600"
                    />
                    File as OT offset credit for future use
                  </label>
                </div>

                <FormField label="Hours to claim" className="md:col-span-2">
                  <input
                    type="text"
                    name="ot_hrs"
                    placeholder="e.g. 2"
                    className={inputClassName}
                  />
                </FormField>
              </>
            )}

            <FormField label="Reason / remarks" className="md:col-span-2">
              <textarea
                name="reason"
                rows={4}
                required
                placeholder="Provide a brief explanation..."
                className={inputClassName}
              />
            </FormField>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Submit to HR
          </button>
        </form>
      </div>
    </div>
  );
}
