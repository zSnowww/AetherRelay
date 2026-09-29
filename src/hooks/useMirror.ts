import { useState, useCallback, useEffect } from "react";
import { desktopApi } from "../api";
import type { MirrorState } from "../types";

export function useMirror() {
  const [mirror, setMirror] = useState<MirrorState>({ running: false, pid: null, serial: null });
  const [hasExitedUnexpectedly, setHasExitedUnexpectedly] = useState(false);

  const syncMirrorState = useCallback(async () => {
    try {
      const state = await desktopApi.state();
      if (mirror.running && !state.running) {
        setHasExitedUnexpectedly(true);
      }
      setMirror(state);
      return state;
    } catch {
      return mirror;
    }
  }, [mirror.running, mirror]);

  useEffect(() => {
    const handleFocus = () => { void syncMirrorState(); };
    window.addEventListener("focus", handleFocus);
    
    let timer: number | undefined;
    if (mirror.running) {
      timer = window.setInterval(() => { void syncMirrorState(); }, 750);
    }
    
    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [mirror.running, syncMirrorState]);

  return { mirror, setMirror, syncMirrorState, hasExitedUnexpectedly, setHasExitedUnexpectedly };
}
