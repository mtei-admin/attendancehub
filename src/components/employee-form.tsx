import { submitRequestAction } from "@/actions/requests";
import { EMPLOYEE_NAMES, REQUEST_TYPES } from "@/lib/constants";

export function EmployeeForm() {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={submitRequestAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Employee Name</span>
          <select
            name="employee_name"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {EMPLOYEE_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Request Type</span>
          <select
            name="request_type"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Date of Incident</span>
          <input
            type="date"
            name="date_of_incident"
            defaultValue={today}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Actual Time In</span>
          <input
            type="text"
            name="time_in"
            placeholder="e.g. 09:30 AM"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">OT Hours (for Offset)</span>
          <input
            type="text"
            name="ot_hrs"
            placeholder="e.g. 4"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Reason / Notes</span>
          <textarea
            name="reason"
            rows={4}
            required
            placeholder="Provide a brief explanation…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
      >
        Submit Request
      </button>
    </form>
  );
}
