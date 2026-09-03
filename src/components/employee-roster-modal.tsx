"use client";

import { useEffect, useMemo, useState } from "react";

import { EMPLOYEE_TYPES } from "@/lib/constants";
import { formatBiometricNo } from "@/lib/biometric";
import type { VerifierOption } from "@/lib/employee-verifiers";
import type { Department } from "@/lib/schema";
import type { EmployeeWithDepartment } from "@/lib/roster";

import { FormField, inputClassName } from "./form-field";
import { FormModal } from "./form-modal";
import { FormModalFooter } from "./form-modal-footer";
import { CompanyDepartmentFields } from "./company-department-fields";
import { getEmployeeTypeLabel } from "./manager-request-utils";

function generateClientAccessCode(): string {
  const value = 100000 + Math.floor(Math.random() * 900000);
  return String(value);
}

type EmployeeRosterModalProps = {
  open: boolean;
  cancelHref: string;
  saveAction: (formData: FormData) => Promise<void>;
  departments: Department[];
  companies: string[];
  verifiers: VerifierOption[];
  assignedVerifierUserIds?: number[];
  editing?: EmployeeWithDepartment | null;
};

export function EmployeeRosterModal({
  open,
  cancelHref,
  saveAction,
  departments,
  companies,
  verifiers,
  assignedVerifierUserIds = [],
  editing = null,
}: EmployeeRosterModalProps) {
  const isEditing = Boolean(editing);
  const [company, setCompany] = useState(editing?.companyName ?? "");
  const [skipVerification, setSkipVerification] = useState(
    Boolean(editing?.skipVerification),
  );
  const [accessCode, setAccessCode] = useState(editing?.accessCode ?? "");

  useEffect(() => {
    if (!open) return;
    setCompany(editing?.companyName ?? "");
    setSkipVerification(Boolean(editing?.skipVerification));
    setAccessCode(editing?.accessCode ?? "");
  }, [open, editing?.id, editing?.companyName, editing?.skipVerification, editing?.accessCode]);

  const companyVerifiers = useMemo(() => {
    if (!company) return [];
    return verifiers.filter(
      (row) => (row.company ?? "").trim().toLowerCase() === company.trim().toLowerCase(),
    );
  }, [company, verifiers]);

  return (
    <FormModal
      open={open}
      cancelHref={cancelHref}
      title={isEditing ? "Edit employee" : "Add employee"}
      titleId="employee-roster-modal-title"
      size="lg"
    >
      <form action={saveAction} className="space-y-4">
        {isEditing && editing && <input type="hidden" name="id" value={editing.id} />}

        <FormField label="Full name">
          <input
            name="full_name"
            required
            defaultValue={editing?.fullName ?? ""}
            className={inputClassName}
            placeholder="Employee name"
            autoFocus
          />
        </FormField>

        <CompanyDepartmentFields
          departments={departments}
          companies={companies}
          defaultCompany={editing?.companyName}
          defaultDepartmentId={editing?.departmentId}
          departmentMode="id"
          onCompanyChange={(next) => setCompany(next)}
        />

        <FormField label="Payroll group">
          <select
            name="employee_type"
            required
            defaultValue={editing?.employeeType ?? "Rank & File"}
            className={inputClassName}
          >
            {EMPLOYEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {getEmployeeTypeLabel(type) || type}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Email (for record requests)">
          <input
            type="email"
            name="email"
            defaultValue={editing?.email ?? ""}
            className={inputClassName}
            placeholder="name@company.com"
          />
        </FormField>

        <FormField label="Biometric number">
          <input
            type="number"
            name="biometric_no"
            min={1}
            step={1}
            defaultValue={formatBiometricNo(editing?.biometricNo)}
            className={inputClassName}
            placeholder="Optional — unique across all companies"
          />
        </FormField>

        <FormField label="My Records access code">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              name="access_code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={accessCode}
              onChange={(event) =>
                setAccessCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={`${inputClassName} max-w-[10rem] font-mono tracking-widest`}
              placeholder="6 digits"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setAccessCode(generateClientAccessCode())}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Generate
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Employees enter this code to unlock My Records. Leave blank on save to auto-generate a
            unique code. Revealable — Admin/HR can view and reset anytime.
          </p>
        </FormField>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">Verification</p>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="skip_verification"
              checked={skipVerification}
              onChange={(event) => setSkipVerification(event.target.checked)}
              className="mt-0.5 rounded border-slate-300"
            />
            <span>
              <span className="font-medium">No Verifier</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                New slips go straight to the manager. Existing pending slips are unchanged.
              </span>
            </span>
          </label>

          {!skipVerification && (
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Can be verified by
              </p>
              <p className="text-xs text-slate-500">
                Leave all unchecked so every verifier in this company can verify (default).
              </p>
              {!company ? (
                <p className="text-sm text-slate-500">Select a company to see verifiers.</p>
              ) : companyVerifiers.length === 0 ? (
                <p className="text-sm text-slate-500">No active verifiers for this company.</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {companyVerifiers.map((verifier) => (
                    <label
                      key={verifier.id}
                      className="flex items-center gap-2 text-sm text-slate-700"
                    >
                      <input
                        type="checkbox"
                        name="verifier_user_ids"
                        value={verifier.id}
                        defaultChecked={assignedVerifierUserIds.includes(verifier.id)}
                        className="rounded border-slate-300"
                      />
                      <span>
                        {verifier.fullName}
                        <span className="text-slate-400"> · {verifier.username}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing && editing && (
          <FormField label="Status">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={editing.isActive}
                className="rounded border-slate-300"
              />
              Active
            </label>
          </FormField>
        )}

        <FormModalFooter cancelHref={cancelHref} />
      </form>
    </FormModal>
  );
}
