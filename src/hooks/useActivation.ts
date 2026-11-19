import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "../api";
import { describeBackendError, type MessageKey } from "../i18n";
import type { ActivationLog, ToastNotification } from "../types";

export type Notice = { key: MessageKey; values?: Record<string, string | number> } | { raw: string };
export type ActivationStatus = "idle" | "running" | "success" | "failed";

type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

interface UseActivationArgs {
  serial: string;
  targetApp?: string;
  t: Translator;
  addToast: (toast: Omit<ToastNotification, "id">) => void;
  setNotice: (notice: Notice) => void;
  setBusy: (busy: boolean) => void;
}

/** Progress shown while the backend runs; the real logs replace these when it returns. */
const PROGRESS_STEPS: Array<{ afterMs: number; message: (targetApp: string) => string }> = [
  { afterMs: 700, message: (target) => `[TARGET] Buscando mapeador objetivo (${target})...` },
  { afterMs: 1700, message: () => "[APP] Lanzando app de mapeo en el dispositivo Android..." },
  { afterMs: 3400, message: () => "[DAEMON] Inyectando script del servidor daemon sin root..." },
];

function logLine(message: string, isError = false): ActivationLog {
  return { timestamp: new Date().toLocaleTimeString(), message, isError };
}

/** Keymapper activation state, the transparency modal, and per-device status. */
export function useActivation({ serial, targetApp, t, addToast, setNotice, setBusy }: UseActivationArgs) {
  const [activatedDevices, setActivatedDevices] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<ActivationStatus>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const [logs, setLogs] = useState<ActivationLog[]>([]);
  const [error, setError] = useState<string | undefined>(undefined);
  const [targetName, setTargetName] = useState("");

  const refreshStatus = useCallback(async (deviceSerial: string) => {
    if (!deviceSerial) return;
    try {
      const active = await desktopApi.checkKeymapperStatus(deviceSerial);
      setActivatedDevices((prev) => ({ ...prev, [deviceSerial]: active }));
    } catch { /* status check is best-effort */ }
  }, []);

  useEffect(() => { void refreshStatus(serial); }, [serial, refreshStatus]);

  const activate = useCallback(async () => {
    if (!serial) return;
    setBusy(true);
    setIsModalOpen(true);
    setStatus("running");
    setStepIndex(0);
    setError(undefined);
    setLogs([logLine(`[ADB] Verificando conexión con dispositivo ${serial}...`)]);
    setNotice({ key: "activatingApps" });

    const timers = PROGRESS_STEPS.map((step, index) =>
      setTimeout(() => {
        setStepIndex(index + 1);
        setLogs((prev) => [...prev, logLine(step.message(targetApp ?? "auto"))]);
      }, step.afterMs),
    );

    try {
      const res = await desktopApi.activateApps(serial, targetApp);
      setStepIndex(PROGRESS_STEPS.length + 1);
      setStatus("success");
      setTargetName(res.appName);
      setLogs(res.logs?.length ? res.logs : [logLine(`[SUCCESS] ¡Mapeador ${res.appName} activado con éxito!`)]);
      setActivatedDevices((prev) => ({ ...prev, [serial]: true }));
      setNotice({ key: "activationCommandCompleted", values: { app: res.appName } });
      addToast({ type: "success", tag: "KEYMAPPER", title: res.appName, message: t("activationStatusSuccess") });
    } catch (err) {
      const message = describeBackendError(t, err);
      setError(message);
      setStatus("failed");
      setLogs((prev) => [...prev, logLine(`[ERROR] ${message}`, true)]);
      setNotice({ raw: message });
      addToast({ type: "error", tag: "KEYMAPPER", message });
    } finally {
      timers.forEach(clearTimeout);
      setBusy(false);
    }
  }, [serial, targetApp, t, addToast, setNotice, setBusy]);

  const deactivate = useCallback(async () => {
    if (!serial) return;
    setBusy(true);
    setNotice({ key: "deactivatingApps" });
    try {
      await desktopApi.deactivateApps(serial);
      setActivatedDevices((prev) => ({ ...prev, [serial]: false }));
      setNotice({ key: "deactivationCompleted" });
      addToast({ type: "info", tag: "KEYMAPPER", message: t("deactivationCompleted") });
    } catch (err) {
      const message = describeBackendError(t, err);
      setNotice({ raw: message });
      addToast({ type: "error", tag: "ERROR", message });
    } finally {
      setBusy(false);
    }
  }, [serial, t, addToast, setNotice, setBusy]);

  return {
    isActivated: Boolean(serial && activatedDevices[serial]),
    refreshStatus,
    activate,
    deactivate,
    modal: {
      isOpen: isModalOpen,
      open: () => setIsModalOpen(true),
      close: () => setIsModalOpen(false),
      status,
      stepIndex,
      logs,
      error,
      targetName,
    },
  };
}
