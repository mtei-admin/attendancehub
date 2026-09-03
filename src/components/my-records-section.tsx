"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { requestRecordsAction, viewRecordsAction } from "@/actions/records";
import { REQUEST_TYPES, STATUSES } from "@/lib/constants";
import type { AttendanceRequest } from "@/lib/schema";
import type { RecordRequestFilters } from "@/lib/record-requests";

import { EmployeeRecordsList } from "./employee-records-list";
import { FormField, inputClassName } from "./form-field";
import { RecordsViewSession } from "./records-view-session";

type MyRecordsSectionProps = {
  smtpConfigured: boolean;
  records: AttendanceRequest[];
  activeRecordView?: { filters: RecordRequestFilters; viewedAt: number };
  editRefId?: string;
  employeeType?: string;
  hasEmailOnFile?: boolean;
  availableOtOffsetBalance?: number | null;
  otSubmittedThisCutoff?: number | null;
  otHrCheckedThisCutoff?: number | null;
  otClaimedCutoffLabel?: string | null;
};

function defaultFromDate() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function ActionButton({
  label,
  pendingLabel,
  disabled,
  formAction,
  variant = "primary",
  onClick,
}: {
  label: string;
  pendingLabel: string;
  disabled?: boolean;
  formAction?: (formData: FormData) => void;
  variant?: "primary" | "secondary";
  onClick?: () => void;
}) {
  const { pending } = useFormStatus();

  const className =
    variant === "primary"
      ? "rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type={onClick ? "button" : "submit"}
      formAction={formAction}
      disabled={disabled || pending}
      className={className}
      onClick={onClick}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

function buildExportUrl(filters: RecordRequestFilters): string {
  const params = new URLSearchParams({
    company: filters.company,
    department: filters.department,
    employee_name: filters.employeeName,
    submitted_from: filters.submittedFrom,
    submitted_to: filters.submittedTo,
  });
  if (filters.requestType) params.set("request_type", filters.requestType);
  if (filters.status) params.set("status", filters.status);
  return `/api/export/employee-records?${params.toString()}`;
}

type PendingAction = "view" | "email" | null;

export function MyRecordsSection({
  smtpConfigured,
  records,
  activeRecordView,
  editRefId,
  employeeType,
  hasEmailOnFile = false,
  availableOtOffsetBalance,
  otSubmittedThisCutoff,
  otHrCheckedThisCutoff,
  otClaimedCutoffLabel,
}: MyRecordsSectionProps) {
  const activeFilters = activeRecordView?.filters;
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [accessCode, setAccessCode] = useState("");

  const canEmail = smtpConfigured;
  const missingEmailUnlocked = Boolean(activeRecordView) && !hasEmailOnFile;

  const identityFields = useMemo(() => {
    if (!activeFilters) return null;
    return (
      <>
        <input type="hidden" name="company" value={activeFilters.company} />
        <input type="hidden" name="department" value={activeFilters.department} />
        <input type="hidden" name="employee_name" value={activeFilters.employeeName} />
      </>
    );
  }, [activeFilters]);

  const filterFields = (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField label="Date submitted from">
        <input
          type="date"
          name="submitted_from"
          required
          defaultValue={activeFilters?.submittedFrom ?? defaultFromDate()}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Date submitted to">
        <input
          type="date"
          name="submitted_to"
          required
          defaultValue={activeFilters?.submittedTo ?? todayIso()}
          className={inputClassName}
        />
      </FormField>

      <FormField label="Request type">
        <select
          name="request_type"
          defaultValue={activeFilters?.requestType ?? ""}
          className={inputClassName}
        >
          <option value="">All types</option>
          {REQUEST_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Status">
        <select
          name="status"
          defaultValue={activeFilters?.status ?? ""}
          className={inputClassName}
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );

  return (
    <div className="space-y-6 rounded-b-2xl border border-t-0 border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">My records</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose a date range (and optional type/status), then unlock with your{" "}
          <strong>6-digit access code</strong>. Pending, unverified requests can be edited.
        </p>
      </div>

      {!smtpConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Email delivery is not configured on the server. You can still view and download records
          below.
        </div>
      )}

      <form
        action={pendingAction === "email" ? requestRecordsAction : viewRecordsAction}
        className="space-y-5"
        onSubmit={(event) => {
          if (!pendingAction || accessCode.length !== 6) {
            event.preventDefault();
          }
        }}
      >
        {identityFields}
        {filterFields}

        {missingEmailUnlocked && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No email is on file for this employee. You can still view records here; contact HR to add
            an email before using email delivery.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <ActionButton
            label="View records"
            pendingLabel="Loading records…"
            onClick={() => {
              setAccessCode("");
              setPendingAction("view");
            }}
          />
          <ActionButton
            label="Send record to email"
            pendingLabel="Sending records…"
            disabled={!canEmail}
            variant="secondary"
            onClick={() => {
              setAccessCode("");
              setPendingAction("email");
            }}
          />
        </div>

        {activeFilters && (
          <p className="text-sm text-slate-600">
            Unlocked as{" "}
            <span className="font-semibold text-slate-900">{activeFilters.employeeName}</span>
            {" · "}
            {activeFilters.company} / {activeFilters.department}
          </p>
        )}

        {pendingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="records-access-code-title"
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <h3
                id="records-access-code-title"
                className="text-lg font-semibold text-slate-900"
              >
                Enter your access code
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Ask Admin or HR if you do not know your 6-digit My Records code.
              </p>

              <div className="mt-5">
                <FormField label="Access code">
                  <input
                    type="text"
                    name="access_code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={accessCode}
                    onChange={(event) =>
                      setAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className={`${inputClassName} font-mono text-center text-lg tracking-[0.35em]`}
                    placeholder="••••••"
                    autoComplete="one-time-code"
                  />
                </FormField>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </button>
                <ActionButton
                  label={pendingAction === "email" ? "Unlock & email" : "Unlock & view"}
                  pendingLabel={pendingAction === "email" ? "Sending…" : "Unlocking…"}
                  disabled={accessCode.length !== 6}
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {activeRecordView && (
        <RecordsViewSession
          filters={activeRecordView.filters}
          viewedAt={activeRecordView.viewedAt}
          editRefId={editRefId}
        >
          <EmployeeRecordsList
            records={records}
            filters={activeRecordView.filters}
            viewedAt={activeRecordView.viewedAt}
            editRefId={editRefId}
            exportUrl={buildExportUrl(activeRecordView.filters)}
            employeeType={employeeType}
            availableOtOffsetBalance={availableOtOffsetBalance}
            otSubmittedThisCutoff={otSubmittedThisCutoff}
            otHrCheckedThisCutoff={otHrCheckedThisCutoff}
            otClaimedCutoffLabel={otClaimedCutoffLabel}
          />
        </RecordsViewSession>
      )}
    </div>
  );
}
