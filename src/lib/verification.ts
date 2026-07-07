export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function isOwnSlip(verifierFullName: string, employeeName: string): boolean {
  return namesMatch(verifierFullName, employeeName);
}

export type VerifierScope = {
  company: string;
  department?: string;
};

export function buildVerifierScope(
  company: string | null,
  department: string | null,
): VerifierScope | undefined {
  if (!company) return undefined;
  return {
    company,
    ...(department ? { department } : {}),
  };
}
