export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isOwnSlip(verifierFullName: string, employeeName: string): boolean {
  return namesMatch(verifierFullName, employeeName);
}

export type VerifierScope = {
  company: string;
  /** PK-based employee visibility for this verifier (policy B + assignments). */
  employeeIds: number[];
  /** Name fallback for legacy slips missing employee_id. */
  employeeNames: string[];
};

/**
 * Company-scoped verifier visibility.
 * Department on the verifier account is ignored; roster assignments are source of truth.
 */
export function buildVerifierScope(
  company: string | null,
  visible: { employeeIds: number[]; employeeNames: string[] },
): VerifierScope | undefined {
  if (!company) return undefined;
  return {
    company,
    employeeIds: visible.employeeIds,
    employeeNames: visible.employeeNames,
  };
}
