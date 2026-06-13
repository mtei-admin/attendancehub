"use client";

type AdminDeleteButtonProps = {
  itemId: number;
  itemName: string;
  deleteAction: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  tab?: string;
};

export function AdminDeleteButton({
  itemId,
  itemName,
  deleteAction,
  confirmMessage,
  tab,
}: AdminDeleteButtonProps) {
  return (
    <form action={deleteAction} className="inline">
      <input type="hidden" name="id" value={itemId} />
      {tab && <input type="hidden" name="tab" value={tab} />}
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        onClick={(event) => {
          if (!confirm(confirmMessage.replace("{name}", itemName))) {
            event.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
