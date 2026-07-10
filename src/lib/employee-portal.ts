import { REQUEST_TYPES } from "./constants";

export const CONFI_EMPLOYEE_TYPE = "Confi";

export function isConfiEmployee(employeeType?: string | null): boolean {
  return employeeType === CONFI_EMPLOYEE_TYPE;
}

export function employeePortalRequestTypes(employeeType?: string | null): readonly string[] {
  if (isConfiEmployee(employeeType)) {
    return REQUEST_TYPES;
  }

  return REQUEST_TYPES.filter((type) => type !== "OT Offset");
}

export function showEmployeePortalTimeFields(requestType: string): boolean {
  return requestType !== "" && requestType !== "Absent/Leave";
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
