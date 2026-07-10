"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { loadExpandedIds, saveExpandedIds } from "@/lib/collapse-groups";

type CollapseGroupContextValue = {
  isOpen: (id: string) => boolean;
  setOpen: (
    id: string,
    open: boolean,
    options?: { descendantIds?: string[]; autoExpandChildIds?: string[] },
  ) => void;
  expandAll: () => void;
  collapseAll: () => void;
};

const CollapseGroupContext = createContext<CollapseGroupContextValue | null>(null);

function useCollapseGroup(): CollapseGroupContextValue {
  const context = useContext(CollapseGroupContext);
  if (!context) {
    throw new Error("CollapsibleSection must be used within CollapseGroupProvider");
  }
  return context;
}

type CollapseGroupProviderProps = {
  storageKey: string;
  allSectionIds: string[];
  children: ReactNode;
};

export function CollapseGroupProvider({
  storageKey,
  allSectionIds,
  children,
}: CollapseGroupProviderProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setExpandedIds(loadExpandedIds(storageKey));
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    saveExpandedIds(storageKey, expandedIds);
  }, [expandedIds, hydrated, storageKey]);

  const isOpen = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  const setOpen = useCallback(
    (
      id: string,
      open: boolean,
      options?: { descendantIds?: string[]; autoExpandChildIds?: string[] },
    ) => {
      setExpandedIds((previous) => {
        const next = new Set(previous);
        if (open) {
          next.add(id);
          for (const childId of options?.autoExpandChildIds ?? []) {
            next.add(childId);
          }
        } else {
          next.delete(id);
          for (const descendantId of options?.descendantIds ?? []) {
            next.delete(descendantId);
          }
        }
        return next;
      });
    },
    [],
  );

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(allSectionIds));
  }, [allSectionIds]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  const value = useMemo(
    () => ({ isOpen, setOpen, expandAll, collapseAll }),
    [collapseAll, expandAll, isOpen, setOpen],
  );

  return (
    <CollapseGroupContext.Provider value={value}>{children}</CollapseGroupContext.Provider>
  );
}

export function CollapseGroupToolbar() {
  const { expandAll, collapseAll } = useCollapseGroup();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Sections
      </span>
      <button
        type="button"
        onClick={expandAll}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Expand all
      </button>
      <button
        type="button"
        onClick={collapseAll}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Collapse all
      </button>
    </div>
  );
}

type CollapsibleSectionLevel = "company" | "department" | "employee" | "section" | "cutoff";

const LEVEL_STYLES: Record<
  CollapsibleSectionLevel,
  { container: string; button: string; title: string }
> = {
  company: {
    container: "border-b border-slate-200",
    button: "sticky top-0 z-10 border-b border-slate-200 bg-slate-100 px-5 py-3",
    title: "text-sm font-semibold text-slate-900",
  },
  department: {
    container: "border-b border-slate-100",
    button: "border-b border-slate-100 bg-slate-50 px-5 py-2.5 pl-8",
    title: "text-sm font-medium text-slate-700",
  },
  employee: {
    container: "border-b border-slate-50",
    button: "bg-white px-5 py-3 pl-10",
    title: "text-sm font-semibold text-slate-900",
  },
  section: {
    container: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm",
    button: "border-b border-slate-200 bg-slate-50 px-5 py-4",
    title: "text-lg font-semibold text-slate-900",
  },
  cutoff: {
    container: "",
    button: "border-b border-slate-100 bg-slate-50/70 px-5 py-3",
    title: "text-sm font-medium text-slate-700",
  },
};

type CollapsibleSectionProps = {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  level: CollapsibleSectionLevel;
  descendantIds?: string[];
  autoExpandChildIds?: string[];
  children: ReactNode;
};

export function CollapsibleSection({
  id,
  title,
  subtitle,
  badge,
  level,
  descendantIds,
  autoExpandChildIds,
  children,
}: CollapsibleSectionProps) {
  const { isOpen, setOpen } = useCollapseGroup();
  const open = isOpen(id);
  const styles = LEVEL_STYLES[level];

  return (
    <div className={styles.container}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() =>
          setOpen(id, !open, {
            descendantIds,
            autoExpandChildIds: open ? undefined : autoExpandChildIds,
          })
        }
        className={`flex w-full items-center gap-3 text-left transition hover:bg-slate-100/70 ${styles.button}`}
      >
        <span
          aria-hidden
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block ${styles.title}`}>{title}</span>
          {subtitle && <span className="mt-0.5 block text-sm text-slate-500">{subtitle}</span>}
        </span>
        {badge}
      </button>
      {open && children}
    </div>
  );
}
