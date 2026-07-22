"use client";

import { useState } from "react";

import { submitManagerSlipAction } from "@/actions/manager";
import { REQUEST_TYPES } from "@/lib/constants";
import { isOtOrHolidayWorkRequestType } from "@/lib/employee-portal";

import { FormField, inputClassName } from "./form-field";
import { OtHoursFields } from "./ot-hours-fields";
import { PendingSubmitButton } from "./pending-submit-button";
import { useOtHoursFromTimeRange } from "./use-ot-hours-from-time-range";

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
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");

  const isSimpleLayout =
    requestType === "Absent/Leave" || requestType === "OT Offset";
  const isOtOrHolidayWork = isOtOrHolidayWorkRequestType(requestType);
  const showTimeFields = !isSimpleLayout;
  const otHoursFromTime = useOtHoursFromTimeRange(timeIn, timeOut, isOtOrHolidayWork);

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
                  <input
                    type="time"
                    name="time_in"
                    required={isOtOrHolidayWork}
                    value={timeIn}
                    onChange={(event) => setTimeIn(event.target.value)}
                    className={inputClassName}
                  />
                </FormField>

                <FormField label="Actual time out">
                  <input
                    type="time"
                    name="time_out"
                    required={isOtOrHolidayWork}
                    value={timeOut}
                    onChange={(event) => setTimeOut(event.target.value)}
                    className={inputClassName}
                  />
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

                <OtHoursFields
                  hoursName="ot_hours"
                  minutesName="ot_minutes"
                  hoursValue={otHoursFromTime.hours}
                  minutesValue={otHoursFromTime.minutes}
                  onHoursChange={otHoursFromTime.setHours}
                  onMinutesChange={otHoursFromTime.setMinutes}
                  required
                  helperText="Auto-calculated from Actual time in/out — you may adjust if needed."
                  className="md:col-span-2"
                />
                {otHoursFromTime.error && (
                  <p className="md:col-span-2 text-sm text-red-600">{otHoursFromTime.error}</p>
                )}
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

          <PendingSubmitButton
            pendingLabel="Submitting…"
            className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Submit to HR
          </PendingSubmitButton>
        </form>
      </div>
    </div>
  );
}
