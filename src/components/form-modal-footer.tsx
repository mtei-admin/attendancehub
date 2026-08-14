import Link from "next/link";

import { PendingSubmitButton } from "./pending-submit-button";

type FormModalFooterProps = {
  cancelHref: string;
};

export function FormModalFooter({ cancelHref }: FormModalFooterProps) {
  return (
    <div className="sticky bottom-0 -mx-6 mt-4 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 pb-1 pt-4">
      <Link
        href={cancelHref}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Cancel
      </Link>
      <PendingSubmitButton
        pendingLabel="Saving…"
        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Save
      </PendingSubmitButton>
    </div>
  );
}
