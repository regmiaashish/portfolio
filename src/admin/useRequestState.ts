import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State for something loaded per request `key` (the inputs that trigger a fetch, plus a reload
 * counter). Until a result is stored for the current key, the value is `pending(previous)`, so a
 * new request shows its loading state as soon as it renders, without an effect resetting state
 * first. Lists pass the previous value through to keep showing it while the next page loads.
 */
export function useRequestState<T>(key: string, pending: (previous: T | undefined) => T) {
  const [entry, setEntry] = useState<{ key: string; value: T } | null>(null);
  const value = entry !== null && entry.key === key ? entry.value : pending(entry?.value);

  // The key whose result may still be stored. Updated in an effect (refs aren't written during
  // render); this hook's effect runs before the caller's fetch effect, which is declared later.
  const currentKey = useRef(key);
  useEffect(() => {
    currentKey.current = key;
  }, [key]);

  /**
   * Stores what the request made for `forKey` returned. Ignored once the key has moved on, so a
   * late answer for an old filter or page can never replace (or un-settle) the current one.
   */
  const settle = useCallback((forKey: string, next: T) => {
    if (forKey !== currentKey.current) return;
    setEntry({ key: forKey, value: next });
  }, []);

  /** Updates the stored result in place, e.g. after a mutation. */
  const update = useCallback(
    (change: (current: T) => T) =>
      setEntry((current) => (current ? { key: current.key, value: change(current.value) } : current)),
    [],
  );

  return [value, settle, update] as const;
}
