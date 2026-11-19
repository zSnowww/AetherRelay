import { useEffect, useState } from "react";
import { DEFAULT_OPTIONS } from "../config/profiles";
import type { MirrorOptions } from "../types";

const STORAGE_KEY = "aether-relay-options";

/** Mirror options persisted in localStorage, merged over the current defaults. */
export function useOptions() {
  const [options, setOptions] = useState<MirrorOptions>(DEFAULT_OPTIONS);
  // State (not a ref) so a re-run effect in the same commit, e.g. React
  // StrictMode, still sees `false` and never saves defaults over user settings.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOptions((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch { /* ignore malformed or unavailable storage */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(options)); } catch { /* storage unavailable */ }
  }, [hydrated, options]);

  return [options, setOptions] as const;
}
