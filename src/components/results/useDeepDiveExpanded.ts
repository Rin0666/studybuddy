import { useState, useCallback } from "react";

export function useDeepDiveExpanded() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isOpen = useCallback((key: string) => expanded.has(key), [expanded]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const close = useCallback((key: string) => {
    setExpanded((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  return { isOpen, toggle, close };
}
