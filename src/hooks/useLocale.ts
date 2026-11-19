import { useCallback, useEffect, useState } from "react";
import { detectLocale, LOCALE_STORAGE_KEY, translate, type Locale, type MessageKey } from "../i18n";

export function useLocale() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    try { localStorage.setItem(LOCALE_STORAGE_KEY, locale); } catch { /* storage unavailable */ }
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values),
    [locale],
  );

  return { locale, setLocale, t };
}
