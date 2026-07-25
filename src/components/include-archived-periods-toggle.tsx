type IncludeArchivedPeriodsToggleProps = {
  baseHref: string;
  includeArchivedPeriods: boolean;
};

export function IncludeArchivedPeriodsToggle({
  baseHref,
  includeArchivedPeriods,
}: IncludeArchivedPeriodsToggleProps) {
  const withParam = (() => {
    const url = new URL(baseHref, "http://local.invalid");
    url.searchParams.set("include_archived_periods", "1");
    return `${url.pathname}?${url.searchParams.toString()}`;
  })();

  const withoutParam = (() => {
    const url = new URL(baseHref, "http://local.invalid");
    url.searchParams.delete("include_archived_periods");
    const query = url.searchParams.toString();
    return query ? `${url.pathname}?${query}` : url.pathname;
  })();

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
      {includeArchivedPeriods ? (
        <p>
          Showing slips from archived cutoff periods.{" "}
          <a href={withoutParam} className="font-semibold text-brand-700 hover:underline">
            Hide archived periods
          </a>
        </p>
      ) : (
        <p>
          Slips in archived cutoff periods are hidden from this queue.{" "}
          <a href={withParam} className="font-semibold text-brand-700 hover:underline">
            Include archived periods
          </a>
        </p>
      )}
    </div>
  );
}
