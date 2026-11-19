import { useCallback, useEffect, useState } from "react";
import { THEME_PALETTES } from "../config/themes";

const STORAGE_KEY = "aether-theme-color";

/** Applies the accent palette as CSS custom properties and remembers the choice. */
export function useTheme() {
  const [themeColor, setThemeColor] = useState("lime");

  const applyTheme = useCallback((themeId: string) => {
    setThemeColor(themeId);
    const palette = THEME_PALETTES.find((p) => p.id === themeId) ?? THEME_PALETTES[0];
    const root = document.documentElement.style;
    root.setProperty("--lime", palette.hex);
    root.setProperty("--lime-soft", palette.soft);
    root.setProperty("--bg", palette.bg);
    root.setProperty("--surface", palette.surface);
    root.setProperty("--border", palette.border);
    root.setProperty("--border-strong", palette.borderStrong);
    root.setProperty("--radial-1", palette.radial1);
    root.setProperty("--radial-2", palette.radial2);
    try { localStorage.setItem(STORAGE_KEY, themeId); } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    let saved = "lime";
    try { saved = localStorage.getItem(STORAGE_KEY) || "lime"; } catch { /* storage unavailable */ }
    applyTheme(saved);
  }, [applyTheme]);

  return { themeColor, applyTheme };
}
