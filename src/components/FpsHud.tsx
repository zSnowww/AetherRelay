import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { desktopApi } from "../api";

export function FpsHud({ active }: { active: boolean }) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!active) { setFps(null); return; }
    const refresh = () => { void desktopApi.fps().then(setFps).catch(() => setFps(null)); };
    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  if (!active) return null;
  return <div className="fps-hud" aria-live="polite" title="FPS de captura reportados por scrcpy">
    <Gauge size={14} /><strong>{fps ?? "—"}</strong><span>FPS</span>
  </div>;
}
