import { switchRoleAction } from "@/actions/requests";
import { ROLES, type Role } from "@/lib/constants";

type SidebarProps = {
  currentRole: Role;
};

export function Sidebar({ currentRole }: SidebarProps) {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Navigation</h2>
      <p className="mt-1 text-sm text-slate-500">Select your portal role</p>

      <div className="mt-6 space-y-2">
        {ROLES.map((role) => (
          <form key={role} action={switchRoleAction}>
            <input type="hidden" name="role" value={role} />
            <button
              type="submit"
              className={`w-full rounded-lg px-4 py-2.5 text-left text-sm font-medium transition ${
                currentRole === role
                  ? "bg-brand-600 text-white"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {role}
            </button>
          </form>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Switch roles to access different portal views.
      </p>
    </aside>
  );
}
