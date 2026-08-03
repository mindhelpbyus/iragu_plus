import { useState, useCallback, useMemo } from 'react';

export interface ColumnDef {
  id: string;
  label: string;
  /** Permanently visible — no checkbox rendered, can't be hidden (e.g. Name, Status). */
  locked?: boolean;
}

/**
 * Column visibility state for a list table's "choose columns" picker,
 * persisted to sessionStorage per table so the choice survives a refresh
 * within the session — sessionStorage (not localStorage) to match the rest
 * of the app's policy of clearing all client-side state on logout/tab close,
 * even though this particular data (which columns are hidden) isn't PHI.
 * `storageKey` should be unique per table, e.g. "ataraxia.clients.columns".
 */
export function useColumnVisibility(storageKey: string, columns: ColumnDef[]) {
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const isVisible = useCallback((id: string) => !hidden.has(id), [hidden]);

  const toggle = useCallback((id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        sessionStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // sessionStorage unavailable (private browsing etc.) — visibility just won't persist.
      }
      return next;
    });
  }, [storageKey]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.locked || isVisible(c.id)),
    [columns, isVisible]
  );

  return { isVisible, toggle, visibleColumns };
}
