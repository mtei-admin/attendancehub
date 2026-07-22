"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { batchCheckRequestsAction } from "@/actions/hr";
import { needsCheckHoursOnHrCheck } from "@/lib/constants";
import { computeHoursFromTimeRange, OT_OFFSET_REQUEST_TYPE } from "@/lib/ot-offset-balance";
import { splitStoredOtHours } from "@/lib/ot-hours";
import type { AttendanceRequest } from "@/lib/schema";

import { useCollapseGroupOptional } from "./collapsible-group";
import { FormModal } from "./form-modal";
import { OtHoursFields } from "./ot-hours-fields";
import { formatManagerTime } from "./manager-request-utils";
import { PendingSubmitButton } from "./pending-submit-button";

export type SlipVisibility = {
  refId: string;
  companyId: string;
  departmentId: string;
  employeeId: string;
};

type HrBatchCheckContextValue = {
  enabled: boolean;
  selectedRefIds: Set<string>;
  toggleRefId: (refId: string) => void;
  setRefIdsSelected: (refIds: string[], selected: boolean) => void;
  isRefVisible: (refId: string) => boolean;
  getVisibleRefIds: (refIds: string[]) => string[];
  requestsByRefId: Map<string, AttendanceRequest>;
  displayOrderRefIds: string[];
};

const HrBatchCheckContext = createContext<HrBatchCheckContextValue | null>(null);

function useHrBatchCheck(): HrBatchCheckContextValue {
  const context = useContext(HrBatchCheckContext);
  if (!context) {
    throw new Error("Hr batch check components must be used within HrBatchCheckProvider");
  }
  return context;
}

type HrBatchCheckProviderProps = {
  requests: AttendanceRequest[];
  slipVisibilities: SlipVisibility[];
  flatMode?: boolean;
  children: ReactNode;
};

export function HrBatchCheckProvider({
  requests,
  slipVisibilities,
  flatMode = false,
  children,
}: HrBatchCheckProviderProps) {
  const collapseGroup = useCollapseGroupOptional();
  const [selectedRefIds, setSelectedRefIds] = useState<Set<string>>(() => new Set());

  const visibilityByRefId = useMemo(
    () => new Map(slipVisibilities.map((entry) => [entry.refId, entry])),
    [slipVisibilities],
  );

  const requestsByRefId = useMemo(
    () => new Map(requests.map((request) => [request.refId, request])),
    [requests],
  );

  const displayOrderRefIds = useMemo(
    () => slipVisibilities.map((entry) => entry.refId),
    [slipVisibilities],
  );

  const isRefVisible = useCallback(
    (refId: string) => {
      const visibility = visibilityByRefId.get(refId);
      if (!visibility) return false;
      if (flatMode) return true;
      if (!collapseGroup) return false;
      return (
        collapseGroup.isOpen(visibility.companyId) &&
        collapseGroup.isOpen(visibility.departmentId) &&
        collapseGroup.isOpen(visibility.employeeId)
      );
    },
    [collapseGroup, flatMode, visibilityByRefId],
  );

  const getVisibleRefIds = useCallback(
    (refIds: string[]) => refIds.filter((refId) => isRefVisible(refId)),
    [isRefVisible],
  );

  const toggleRefId = useCallback((refId: string) => {
    setSelectedRefIds((previous) => {
      const next = new Set(previous);
      if (next.has(refId)) {
        next.delete(refId);
      } else {
        next.add(refId);
      }
      return next;
    });
  }, []);

  const setRefIdsSelected = useCallback((refIds: string[], selected: boolean) => {
    setSelectedRefIds((previous) => {
      const next = new Set(previous);
      for (const refId of refIds) {
        if (selected) {
          next.add(refId);
        } else {
          next.delete(refId);
        }
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      enabled: true,
      selectedRefIds,
      toggleRefId,
      setRefIdsSelected,
      isRefVisible,
      getVisibleRefIds,
      requestsByRefId,
      displayOrderRefIds,
    }),
    [
      displayOrderRefIds,
      getVisibleRefIds,
      isRefVisible,
      requestsByRefId,
      selectedRefIds,
      setRefIdsSelected,
      toggleRefId,
    ],
  );

  return (
    <HrBatchCheckContext.Provider value={value}>{children}</HrBatchCheckContext.Provider>
  );
}

export function HrBatchCheckToolbar({ returnTab }: { returnTab: string }) {
  const { selectedRefIds } = useHrBatchCheck();
  const [modalOpen, setModalOpen] = useState(false);
  const selectedCount = selectedRefIds.size;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Batch check
        </span>
        <button
          type="button"
          disabled={selectedCount === 0}
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Review &amp; check{selectedCount > 0 ? ` (${selectedCount})` : ""}
        </button>
      </div>
      <HrBatchCheckReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        returnTab={returnTab}
      />
    </>
  );
}

export function HrBatchCheckSectionSelect({
  refIds,
  label,
}: {
  refIds: string[];
  label: string;
}) {
  const { selectedRefIds, getVisibleRefIds, setRefIdsSelected } = useHrBatchCheck();
  const visibleRefIds = getVisibleRefIds(refIds);

  if (visibleRefIds.length === 0) {
    return null;
  }

  const selectedVisibleCount = visibleRefIds.filter((refId) => selectedRefIds.has(refId)).length;
  const allSelected = selectedVisibleCount === visibleRefIds.length;
  const partiallySelected = selectedVisibleCount > 0 && !allSelected;

  return (
    <label
      className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <input
        type="checkbox"
        aria-label={label}
        checked={allSelected}
        ref={(input) => {
          if (input) {
            input.indeterminate = partiallySelected;
          }
        }}
        onChange={(event) => {
          setRefIdsSelected(visibleRefIds, event.target.checked);
        }}
        onClick={(event) => event.stopPropagation()}
        className="rounded border-slate-300 text-brand-600"
      />
      <span>Select visible</span>
    </label>
  );
}

export function HrBatchCheckRowSelect({ refId }: { refId: string }) {
  const { selectedRefIds, toggleRefId, isRefVisible } = useHrBatchCheck();

  if (!isRefVisible(refId)) {
    return <span className="inline-block w-4" aria-hidden />;
  }

  return (
    <input
      type="checkbox"
      aria-label={`Select ${refId} for batch check`}
      checked={selectedRefIds.has(refId)}
      onChange={() => toggleRefId(refId)}
      className="rounded border-slate-300 text-brand-600"
    />
  );
}

function HrBatchCheckReviewModal({
  open,
  onClose,
  returnTab,
}: {
  open: boolean;
  onClose: () => void;
  returnTab: string;
}) {
  const { selectedRefIds, requestsByRefId, displayOrderRefIds } = useHrBatchCheck();

  const selectedRequests = useMemo(
    () =>
      displayOrderRefIds
        .filter((refId) => selectedRefIds.has(refId))
        .map((refId) => requestsByRefId.get(refId))
        .filter((request): request is AttendanceRequest => Boolean(request)),
    [displayOrderRefIds, requestsByRefId, selectedRefIds],
  );

  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Review batch check"
      titleId="hr-batch-check-review-modal-title"
      size="xl"
    >
      <p className="mt-2 text-sm text-slate-500">
        Review each selected slip before marking as HR-checked. Failed slips are skipped and the
        rest continue.
      </p>

      <form action={batchCheckRequestsAction} className="mt-5 space-y-4">
        <input type="hidden" name="return_tab" value={returnTab} />
        {selectedRequests.map((request) => (
          <input key={request.refId} type="hidden" name="ref_ids" value={request.refId} />
        ))}

        <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto pr-1">
          {selectedRequests.map((request) => {
            const requiresHours = needsCheckHoursOnHrCheck(request.requestType);
            const isOtOffset = request.requestType === OT_OFFSET_REQUEST_TYPE;
            const approvedDefaults = splitStoredOtHours(request.otHrs ?? request.requestedOtHrs);
            const offsetDuration = isOtOffset
              ? computeHoursFromTimeRange(request.timeIn, request.timeOut)
              : null;

            return (
              <div
                key={request.refId}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {request.refId} · {request.employeeName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {request.requestType} · {request.dateOfIncident}
                    </p>
                    {(request.timeIn || request.timeOut) && (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatManagerTime(request.timeIn)} – {formatManagerTime(request.timeOut)}
                      </p>
                    )}
                  </div>
                </div>

                {requiresHours && (
                  <div className="mt-3">
                    <OtHoursFields
                      label="HR-confirmed hours"
                      hoursName={`approved_ot_hours_${request.refId}`}
                      minutesName={`approved_ot_minutes_${request.refId}`}
                      defaultHours={approvedDefaults.hours}
                      defaultMinutes={approvedDefaults.minutes}
                      required
                    />
                  </div>
                )}

                {isOtOffset && offsetDuration?.valid && (
                  <p className="mt-3 text-sm text-slate-600">
                    Offset duration: <strong>{offsetDuration.storedValue} hrs</strong>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <PendingSubmitButton
            pendingLabel="Checking…"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Check {selectedRequests.length} slip{selectedRequests.length === 1 ? "" : "s"}
          </PendingSubmitButton>
        </div>
      </form>
    </FormModal>
  );
}

export function useHrBatchCheckOptional() {
  return useContext(HrBatchCheckContext);
}
