import { useState, useCallback, useEffect } from "react";
import { desktopApi, onDevicesChanged } from "../api";
import type { Device } from "../types";

export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);

  const refreshDevices = useCallback(async () => {
    try {
      const found = await desktopApi.devices();
      setDevices(found);
      return found;
    } catch {
      return []; // Fallback empty on error
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;

    async function refreshDevicesSilently() {
      if (refreshing) return;
      refreshing = true;
      try {
        const found = await desktopApi.devices();
        if (!cancelled) setDevices(found);
      } catch {
        // Ignore errors for silent background refresh
      } finally {
        refreshing = false;
      }
    }

    // Probe immediately on mount
    void refreshDevicesSilently();

    const handleFocus = () => { void refreshDevicesSilently(); };
    // The backend pushes "devices-changed" from `adb track-devices`; the slow
    // poll only covers the watcher restarting (e.g. adb server restart).
    let unlisten: (() => void) | undefined;
    void onDevicesChanged(() => { void refreshDevicesSilently(); }).then((fn) => {
      if (cancelled) fn(); else unlisten = fn;
    });
    const timer = window.setInterval(() => {
      void refreshDevicesSilently();
    }, 15000);

    window.addEventListener("focus", handleFocus);
    return () => {
      cancelled = true;
      unlisten?.();
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return { devices, setDevices, refreshDevices };
}
