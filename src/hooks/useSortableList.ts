import { useState, useCallback } from 'react';

export type SortOrder = 'asc' | 'desc';

/**
 * Shared state machine for a server-paginated, server-sorted list: sort
 * column/direction, current page, and a `toggleSort` helper that cycles
 * asc -> desc -> asc on repeat clicks of the same column (and resets to
 * asc when switching to a new column). Resets to page 1 on any sort change,
 * since a stale page number from the old order rarely lines up with the new one.
 */
export function useSortableList<TSortField extends string>(defaultSortBy: TSortField) {
  const [sortBy, setSortBy] = useState<TSortField>(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);

  const toggleSort = useCallback((field: TSortField) => {
    setPage(1);
    setSortBy((prevField) => {
      if (prevField === field) {
        setSortOrder((prevOrder) => (prevOrder === 'asc' ? 'desc' : 'asc'));
        return prevField;
      }
      setSortOrder('asc');
      return field;
    });
  }, []);

  return { sortBy, sortOrder, page, setPage, toggleSort };
}
