"use client";

import { useState } from "react";

import { checkRequestAction, hrRejectRequestAction } from "@/actions/hr";
import { needsCheckHoursOnHrCheck } from "@/lib/constants";
import type { AttendanceRequest } from "@/lib/schema";

import { HrCheckHoursModal } from "./hr-check-hours-modal";
import { RejectRequestButton } from "./reject-request-button";

type HrCheckActionProps = {
  request: AttendanceRequest;
};

export function HrCheckAction({ request }: HrCheckActionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const requiresHoursDialog = needsCheckHoursOnHrCheck(request.requestType);

  return (
    <div className="flex flex-col items-start gap-2">
      {requiresHoursDialog ? (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            title="Confirm hours and mark as checked"
          >
            ✓
          </button>
          <HrCheckHoursModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            request={request}
          />
        </>
      ) : (
        <form action={checkRequestAction}>
          <input type="hidden" name="ref_id" value={request.refId} />
          <button
            type="submit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-700"
            title="Mark as checked"
          >
            ✓
          </button>
        </form>
      )}
      <RejectRequestButton refId={request.refId} action={hrRejectRequestAction} />
    </div>
  );
}
