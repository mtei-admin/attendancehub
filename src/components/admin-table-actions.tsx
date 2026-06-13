import Link from "next/link";

import { AdminDeleteButton } from "./admin-delete-button";

export function PasswordBadge({ value }: { value: string | null | undefined }) {
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">
      {value || "—"}
    </span>
  );
}

export function AdminTableActions({
  editHref,
  itemId,
  itemName,
  deleteAction,
  confirmMessage,
  tab,
}: {
  editHref: string;
  itemId: number;
  itemName: string;
  deleteAction: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  tab?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={editHref}
        className="rounded-lg border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
      >
        Edit
      </Link>
      <AdminDeleteButton
        itemId={itemId}
        itemName={itemName}
        deleteAction={deleteAction}
        confirmMessage={confirmMessage}
        tab={tab}
      />
    </div>
  );
}
