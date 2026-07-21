import type { AttendanceRequest } from "./schema";

/**
 * Special managers who may approve only a fixed employee allowlist.
 * Those employees still appear for the normal department manager as well.
 * Add another employee name to the array if a second exception is needed.
 */
export const MANAGER_EMPLOYEE_APPROVAL_SCOPES: ReadonlyArray<{
  managerName: string;
  employeeNames: readonly string[];
  /** When true, File a slip is hidden and blocked for this manager. */
  disableFileOwnSlip: boolean;
}> = [
  {
    managerName: "SO, DOMINIC DEXTER",
    employeeNames: ["PAGADOR, ABRAHAM JR TALINES"],
    disableFileOwnSlip: true,
  },
];

function normalizePersonName(name: string): string {
  return name.trim().toLowerCase();
}

function namesMatch(left: string, right: string): boolean {
  return normalizePersonName(left) === normalizePersonName(right);
}

export function getManagerEmployeeApprovalScope(managerName: string) {
  return (
    MANAGER_EMPLOYEE_APPROVAL_SCOPES.find((scope) =>
      namesMatch(scope.managerName, managerName),
    ) ?? null
  );
}

export function isEmployeeOnlyManager(managerName: string): boolean {
  return Boolean(getManagerEmployeeApprovalScope(managerName));
}

export function managerCanFileOwnSlip(managerName: string): boolean {
  const scope = getManagerEmployeeApprovalScope(managerName);
  if (!scope) return true;
  return !scope.disableFileOwnSlip;
}

export function managerCanApproveEmployee(
  managerName: string,
  employeeName: string,
): boolean {
  const scope = getManagerEmployeeApprovalScope(managerName);
  if (!scope) return true;
  return scope.employeeNames.some((allowed) => namesMatch(allowed, employeeName));
}

export function filterRequestsForManagerEmployeeScope<T extends AttendanceRequest>(
  managerName: string,
  requests: T[],
): T[] {
  const scope = getManagerEmployeeApprovalScope(managerName);
  if (!scope) return requests;
  return requests.filter((request) =>
    scope.employeeNames.some((allowed) => namesMatch(allowed, request.employeeName)),
  );
}

export function getManagerAllowedEmployeeNames(managerName: string): string[] | null {
  const scope = getManagerEmployeeApprovalScope(managerName);
  if (!scope) return null;
  return [...scope.employeeNames];
}

export function formatManagerEmployeeScopeLabel(managerName: string): string | null {
  const scope = getManagerEmployeeApprovalScope(managerName);
  if (!scope) return null;
  return scope.employeeNames.join(", ");
}
