import Link from "next/link";

type FormModalFooterProps = {
  cancelHref: string;
};

export function FormModalFooter({ cancelHref }: FormModalFooterProps) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <Link
        href={cancelHref}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Cancel
      </Link>
      <button
        type="submit"
        className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Save
      </button>
    </div>
  );
}
