import { needsCheckHoursOnHrCheck } from "@/lib/constants";
import { isDirectHrConfiOwnSlip } from "@/lib/direct-hr-confi-slips";
import { canHrCheckRequest } from "@/lib/hr-portal-access";
import type { SessionUser } from "@/lib/auth";
import { parseOtHours } from "@/lib/ot-summary";
import type { OtHoursFieldParseResult } from "@/lib/ot-hours";
import {
  computeAvailableOtOffsetBalanceFromRecords,
  computeOtOffsetHoursFromTimeRange,
  employeePlacementKey,
  formatInsufficientOtOffsetBalanceMessage,
  OT_OFFSET_REQUEST_TYPE,
  resolveEmployeePlacement,
} from "@/lib/ot-offset-balance";
import { archiveRequest } from "@/lib/requests";
import type { AttendanceRequest } from "@/lib/schema";

export type BatchCheckItemResult = {
  refId: string;
  success: boolean;
  error?: string;
};

export type BatchCheckSummary = {
  checked: number;
  failed: number;
  results: BatchCheckItemResult[];
};

export { employeePlacementKey, resolveEmployeePlacement };

export function resolveCheckedOtHrsForRequest(
  request: AttendanceRequest,
  approvedOtHours: OtHoursFieldParseResult | null,
): { checkedOtHrs: string | null; error?: string } {
  if (needsCheckHoursOnHrCheck(request.requestType)) {
    if (!approvedOtHours || approvedOtHours.empty) {
      return { checkedOtHrs: null, error: "Number of hours approved is required." };
    }

    if (!approvedOtHours.valid || approvedOtHours.totalHours <= 0) {
      return {
        checkedOtHrs: null,
        error: approvedOtHours.error ?? "Enter valid approved hours greater than zero.",
      };
    }

    return { checkedOtHrs: approvedOtHours.storedValue };
  }

  if (request.requestType === OT_OFFSET_REQUEST_TYPE) {
    const timeRange = computeOtOffsetHoursFromTimeRange(request.timeIn, request.timeOut, {
      required: true,
    });

    if (!timeRange.valid || timeRange.totalHours <= 0) {
      return {
        checkedOtHrs: null,
        error: timeRange.error ?? "Valid From and To times are required for OT Offset.",
      };
    }

    return { checkedOtHrs: timeRange.storedValue };
  }

  return { checkedOtHrs: null };
}

function validateOtOffsetAgainstBalance(
  request: AttendanceRequest,
  debitHours: number,
  runningBalanceByEmployee: Map<string, number>,
): string | null {
  const key = employeePlacementKey(resolveEmployeePlacement(request));
  const available = runningBalanceByEmployee.get(key) ?? 0;

  if (debitHours > available) {
    return formatInsufficientOtOffsetBalanceMessage(available, debitHours);
  }

  return null;
}

function applySuccessfulCheckToRunningBalance(
  request: AttendanceRequest,
  checkedOtHrs: string | null,
  otEligibleTypes: readonly string[],
  runningBalanceByEmployee: Map<string, number>,
): void {
  const key = employeePlacementKey(resolveEmployeePlacement(request));
  const current = runningBalanceByEmployee.get(key) ?? 0;
  const eligibleCreditTypes = new Set(
    otEligibleTypes.filter((type) => type !== OT_OFFSET_REQUEST_TYPE),
  );

  if (request.requestType === OT_OFFSET_REQUEST_TYPE && checkedOtHrs) {
    const { hours, valid } = parseOtHours(checkedOtHrs);
    if (valid) {
      runningBalanceByEmployee.set(key, Math.max(0, current - hours));
    }
    return;
  }

  if (checkedOtHrs && eligibleCreditTypes.has(request.requestType)) {
    const { hours, valid } = parseOtHours(checkedOtHrs);
    if (valid) {
      runningBalanceByEmployee.set(key, current + hours);
    }
  }
}

function parseOtHoursSimple(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortBatchCheckProcessingOrder(
  orderedRefIds: string[],
  requestsByRefId: Map<string, AttendanceRequest>,
): string[] {
  const creditsAndSimple: string[] = [];
  const offsets: string[] = [];

  for (const refId of orderedRefIds) {
    const request = requestsByRefId.get(refId);
    if (request?.requestType === OT_OFFSET_REQUEST_TYPE) {
      offsets.push(refId);
    } else {
      creditsAndSimple.push(refId);
    }
  }

  return [...creditsAndSimple, ...offsets];
}

export async function processHrBatchCheck(input: {
  session: SessionUser;
  requests: AttendanceRequest[];
  orderedRefIds: string[];
  approvedHoursByRefId: Record<string, OtHoursFieldParseResult | null>;
  otEligibleTypes: readonly string[];
  existingCheckedRecords: AttendanceRequest[];
  resolveEmployeeType: (request: AttendanceRequest) => string | undefined;
  archivedBy: string;
}): Promise<BatchCheckSummary> {
  const requestByRefId = new Map(input.requests.map((request) => [request.refId, request]));
  const processingOrder = sortBatchCheckProcessingOrder(input.orderedRefIds, requestByRefId);
  const runningBalanceByEmployee = new Map<string, number>();
  const { sumOtOffsetBalanceOverridesByPlacement } = await import(
    "@/lib/ot-offset-balance-overrides"
  );
  const manualAdjustments = await sumOtOffsetBalanceOverridesByPlacement();

  for (const request of input.requests) {
    const key = employeePlacementKey(resolveEmployeePlacement(request));
    if (!runningBalanceByEmployee.has(key)) {
      const employeeRecords = input.existingCheckedRecords.filter(
        (record) => employeePlacementKey(resolveEmployeePlacement(record)) === key,
      );
      runningBalanceByEmployee.set(
        key,
        computeAvailableOtOffsetBalanceFromRecords(
          employeeRecords,
          input.otEligibleTypes,
          manualAdjustments.get(key) ?? 0,
        ),
      );
    }
  }

  const results: BatchCheckItemResult[] = [];
  let checked = 0;
  let failed = 0;

  for (const refId of processingOrder) {
    const request = requestByRefId.get(refId);
    if (!request) {
      failed += 1;
      results.push({ refId, success: false, error: "Request not found." });
      continue;
    }

    if (request.status !== "Approved" || request.archived) {
      failed += 1;
      results.push({
        refId,
        success: false,
        error: "Request is not eligible for HR checking.",
      });
      continue;
    }

    const employeeType = input.resolveEmployeeType(request);
    if (
      !canHrCheckRequest(
        input.session,
        isDirectHrConfiOwnSlip(request) ? "Confi" : employeeType,
      )
    ) {
      failed += 1;
      results.push({ refId, success: false, error: "Not allowed to check this slip." });
      continue;
    }

    const { checkedOtHrs, error: hoursError } = resolveCheckedOtHrsForRequest(
      request,
      input.approvedHoursByRefId[refId] ?? null,
    );

    if (hoursError) {
      failed += 1;
      results.push({ refId, success: false, error: hoursError });
      continue;
    }

    if (request.requestType === OT_OFFSET_REQUEST_TYPE && checkedOtHrs) {
      const balanceError = validateOtOffsetAgainstBalance(
        request,
        parseOtHoursSimple(checkedOtHrs),
        runningBalanceByEmployee,
      );
      if (balanceError) {
        failed += 1;
        results.push({ refId, success: false, error: balanceError });
        continue;
      }
    }

    const archived = await archiveRequest(refId, input.archivedBy, checkedOtHrs);
    if (!archived) {
      failed += 1;
      results.push({ refId, success: false, error: "Could not mark as checked." });
      continue;
    }

    applySuccessfulCheckToRunningBalance(
      request,
      checkedOtHrs,
      input.otEligibleTypes,
      runningBalanceByEmployee,
    );
    checked += 1;
    results.push({ refId, success: true });
  }

  return { checked, failed, results };
}

export function buildBatchCheckSuccessMessage(summary: BatchCheckSummary): string {
  if (summary.failed === 0) {
    return `Checked ${summary.checked} slip${summary.checked === 1 ? "" : "s"}.`;
  }

  return `Checked ${summary.checked} slip${summary.checked === 1 ? "" : "s"}; ${summary.failed} skipped.`;
}

export function buildBatchCheckErrorDetails(summary: BatchCheckSummary): string {
  const failures = summary.results.filter((result) => !result.success);
  if (failures.length === 0) return "";

  const preview = failures
    .slice(0, 3)
    .map((result) => `${result.refId}: ${result.error}`)
    .join(" · ");

  if (failures.length > 3) {
    return `${preview} · +${failures.length - 3} more`;
  }

  return preview;
}
