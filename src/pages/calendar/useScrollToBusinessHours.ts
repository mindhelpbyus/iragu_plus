import { useCallback, useRef } from 'react';

/** Scrolls the hour grid to ~08:15 on first mount, matching the prototype's initial scroll position. */
export function useScrollToBusinessHours() {
  const scrolledRef = useRef(false);
  return useCallback((el: HTMLDivElement | null) => {
    if (el && !scrolledRef.current) {
      scrolledRef.current = true;
      el.scrollTop = 660;
    }
  }, []);
}
