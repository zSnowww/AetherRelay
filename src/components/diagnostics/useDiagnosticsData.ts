import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopApi, onStutterMarked } from "../../api";
import type { ScrcpyLogEntry, SessionDiagnostics, SessionSample, StutterBookmark } from "../../types";

const POLL_MS = 1500;
const SAMPLE_LIMIT = 60;
const LOG_LIMIT = 300;
/** A bookmark is drawn on the nearest sample within this window. */
const BOOKMARK_MATCH_MS = 3000;

/**
 * Polls the in-memory session snapshot while the Diagnostics panel is mounted
 * and turns on the backend's device probes for that time.
 */
export function useDiagnosticsData() {
  const [session, setSession] = useState<SessionDiagnostics | null>(null);
  const [samples, setSamples] = useState<SessionSample[]>([]);
  const [bookmarks, setBookmarks] = useState<StutterBookmark[]>([]);
  const [logs, setLogs] = useState<ScrcpyLogEntry[]>([]);

  const refresh = useCallback(async () => {
    try {
      setSession(await desktopApi.sessionDiagnostics());
      setSamples(await desktopApi.sessionSamples(SAMPLE_LIMIT));
      setBookmarks(await desktopApi.stutterBookmarks());
      setLogs(await desktopApi.scrcpyLogs(LOG_LIMIT));
    } catch {
      // No session yet, or not running inside the desktop app.
    }
  }, []);

  // Device probes (adb latency, thermal, USB) only run while this panel is open.
  useEffect(() => {
    void desktopApi.setDiagnosticsProbes(true).catch(() => {});
    return () => {
      void desktopApi.setDiagnosticsProbes(false).catch(() => {});
    };
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Stutter marked from the compositor keybind, CLI or another view.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    void onStutterMarked(() => { void refresh(); }).then((fn) => {
      if (disposed) fn(); else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [refresh]);

  const clearLogs = useCallback(async () => {
    try {
      await desktopApi.clearScrcpyLogs();
      setLogs([]);
    } catch { /* ignore */ }
  }, []);

  const latencyHistory = useMemo(() => samples.map((s) => s.adbCommandLatencyMs ?? 0), [samples]);

  const stutterMarkIndices = useMemo(() => {
    if (samples.length === 0) return [];
    const indices = new Set<number>();
    samples.forEach((s, idx) => { if (s.isStutterMark) indices.add(idx); });
    for (const b of bookmarks) {
      if (b.elapsedMs === undefined || b.elapsedMs === null) continue;
      let closestIdx = -1;
      let minDiff = Infinity;
      samples.forEach((s, i) => {
        const diff = Math.abs((s.elapsedMs ?? 0) - b.elapsedMs);
        if (diff < minDiff) { minDiff = diff; closestIdx = i; }
      });
      if (closestIdx !== -1 && minDiff <= BOOKMARK_MATCH_MS) indices.add(closestIdx);
    }
    return Array.from(indices).sort((a, b) => a - b);
  }, [samples, bookmarks]);

  return { session, bookmarks, logs, refresh, clearLogs, latencyHistory, stutterMarkIndices };
}
