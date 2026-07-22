import { REQUEST_TYPES } from "./constants";

export const CONFI_EMPLOYEE_TYPE = "Confi";
export const ABSENT_LEAVE_REQUEST_TYPE = "Absent/Leave";
/** Full-day default when Absent/Leave From/To are left blank. */
export const DEFAULT_FULL_DAY_TIME_IN = "08:00";
export const DEFAULT_FULL_DAY_TIME_OUT = "17:00";

export function isConfiEmployee(employeeType?: string | null): boolean {
  return employeeType === CONFI_EMPLOYEE_TYPE;
}

export function employeePortalRequestTypes(employeeType?: string | null): readonly string[] {
  if (isConfiEmployee(employeeType)) {
    return REQUEST_TYPES;
  }

  return REQUEST_TYPES.filter((type) => type !== "OT Offset");
}

export function isAbsentLeaveRequestType(requestType: string): boolean {
  return requestType === ABSENT_LEAVE_REQUEST_TYPE;
}

export function isOtOrHolidayWorkRequestType(requestType: string): boolean {
  return requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
}

export function showEmployeePortalTimeFields(requestType: string): boolean {
  return requestType !== "";
}

/**
 * For Absent/Leave only: if both From and To are blank, use 08:00–17:00.
 * Partial times are left unchanged so validation can require both.
 */
export function applyEmployeePortalTimeDefaults(
  requestType: string,
  timeIn: string,
  timeOut: string,
): { timeIn: string; timeOut: string } {
  const trimmedIn = timeIn.trim();
  const trimmedOut = timeOut.trim();

  if (isAbsentLeaveRequestType(requestType) && !trimmedIn && !trimmedOut) {
    return { timeIn: DEFAULT_FULL_DAY_TIME_IN, timeOut: DEFAULT_FULL_DAY_TIME_OUT };
  }

  return { timeIn: trimmedIn, timeOut: trimmedOut };
}

export function validateEmployeePortalTimeFields(
  requestType: string,
  timeIn: string,
  timeOut: string,
): string | null {
  if (!showEmployeePortalTimeFields(requestType)) {
    return null;
  }

  if (!timeIn.trim() || !timeOut.trim()) {
    return "From and To times are required.";
  }

  return null;
}

export function showOtOffsetCreditCheckbox(
  employeeType: string | null | undefined,
  requestType: string,
): boolean {
  if (!isConfiEmployee(employeeType)) {
    return false;
  }

  return requestType === "Overtime" || requestType === "Holiday/Rest Day Work";
}

export function validateEmployeePortalOtFeatures(
  employeeType: string,
  requestType: string,
  fileAsOtOffset: boolean,
): string | null {
  if (requestType === "OT Offset" && !isConfiEmployee(employeeType)) {
    return "OT Offset is only available for Confi employees.";
  }

  if (fileAsOtOffset && !isConfiEmployee(employeeType)) {
    return "OT offset credit is only available for Confi employees.";
  }

  if (
    fileAsOtOffset &&
    requestType !== "Overtime" &&
    requestType !== "Holiday/Rest Day Work"
  ) {
    return "OT offset credit applies only to Overtime or Holiday/Rest Day Work.";
  }

  return null;
}
