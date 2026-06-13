"use client";

type RosterDeleteButtonProps = {
  employeeId: number;
  employeeName: string;
  deleteAction: (formData: FormData) => Promise<void>;
};

export function RosterDeleteButton({
  employeeId,
  employeeName,
  deleteAction,
}: RosterDeleteButtonProps) {
  return (
    <form action={deleteAction} className="inline">
      <input type="hidden" name="id" value={employeeId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
        onClick={(event) => {
          if (!confirm(`Remove ${employeeName} from the roster?`)) {
            event.preventDefault();
          }
        }}
      >
        Delete
      </button>
    </form>
  );
}
