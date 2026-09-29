"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleStop, Globe, MonitorPlay, Zap, ZapOff, Activity, SlidersHorizontal } from "lucide-react";
import { desktopApi } from "../api";
import { detectLocale, localizeBackendError, translate, type Locale, type MessageKey } from "../i18n";
import packageMetadata from "../../package.json";
import { useDevices } from "../hooks/useDevices";
import { useMirror } from "../hooks/useMirror";

import { DeviceList } from "../components/DeviceList";
import { SettingsPanel } from "../components/SettingsPanel";
import { ShortcutsPanel } from "../components/ShortcutsPanel";
import { PerformancePanel } from "../components/PerformancePanel";
import { PreferencesPanel, THEME_PALETTES } from "../components/PreferencesPanel";
import { FpsHud } from "../components/FpsHud";
import { ActivationModal } from "../components/ActivationModal";
import { ToastContainer } from "../components/ToastContainer";
import { AetherLogo } from "../components/AetherLogo";
import type { ActivationLog, EnvironmentStatus, MirrorOptions, ToastNotification } from "../types";

type Notice = { key: MessageKey; values?: Record<string, string | number> } | { raw: string };

const defaults: MirrorOptions = {
  serial: "", maxSize: 1920, videoBitRateMbps: 12, maxFps: 60,
  turnScreenOff: false, stayAwake: true, fullscreen: false,
  audio: true, alwaysOnTop: false,
  targetApp: "auto",
  launchPandaMousePro: true, launchAppPackage: "", shortcutMod: "lalt,lsuper", virtualDisplay: false
};

export default function Page() {
  const [locale, setLocale] = useState<Locale>("en"); // Fallback initial
  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null);
  const [options, setOptions] = useState(defaults);
  const [busy, setBusy] = useState(false);
  const [showDeviceHelp, setShowDeviceHelp] = useState(false);
  const [activeView, setActiveView] = useState<"mirror" | "performance" | "preferences">("mirror");
  const [notice, setNotice] = useState<Notice>({ key: "checkingEnvironment" });
  
  // Activation state & tracking
  const [activatedDevices, setActivatedDevices] = useState<Record<string, boolean>>({});
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [activationStatus, setActivationStatus] = useState<"idle" | "running" | "success" | "failed">("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [activationLogs, setActivationLogs] = useState<ActivationLog[]>([]);
  const [activationError, setActivationError] = useState<string | undefined>(undefined);
  const [activationTargetName, setActivationTargetName] = useState<string>("");

  // Toast notifications & theme
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [themeColor, setThemeColor] = useState<string>("lime");

  const addToast = useCallback((toast: Omit<ToastNotification, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyTheme = useCallback((themeId: string) => {
    setThemeColor(themeId);
    try {
      localStorage.setItem("aether-theme-color", themeId);
      const palette = THEME_PALETTES.find((p) => p.id === themeId) ?? THEME_PALETTES[0];
      document.documentElement.style.setProperty("--lime", palette.hex);
      document.documentElement.style.setProperty("--lime-soft", palette.soft);
      document.documentElement.style.setProperty("--bg", palette.bg);
      document.documentElement.style.setProperty("--surface", palette.surface);
      document.documentElement.style.setProperty("--border", palette.border);
      document.documentElement.style.setProperty("--border-strong", palette.borderStrong);
      document.documentElement.style.setProperty("--radial-1", palette.radial1);
      document.documentElement.style.setProperty("--radial-2", palette.radial2);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("aether-theme-color") || "lime";
      applyTheme(savedTheme);
    } catch { /* ignore */ }
  }, [applyTheme]);

  const { devices, refreshDevices } = useDevices();
  const { mirror, setMirror, hasExitedUnexpectedly, setHasExitedUnexpectedly } = useMirror();
  
  useEffect(() => { setLocale(detectLocale()); }, []);

  useEffect(() => {
    const saved = localStorage.getItem("aether-relay-options");
    if (!saved) return;
    try { setOptions(current => ({ ...current, ...JSON.parse(saved) })); } catch { /* Ignore malformed saved preferences. */ }
  }, []);

  useEffect(() => { localStorage.setItem("aether-relay-options", JSON.stringify(options)); }, [options]);

  const t = useCallback((key: MessageKey, values?: Record<string, string | number>) => translate(locale, key, values), [locale]);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const env = await desktopApi.environment();
      setEnvironment(env);
      const found = await refreshDevices();
      const state = await desktopApi.state();
      setMirror(state);
      
      const usable = found.filter((device) => device.state === "device");
      setShowDeviceHelp(usable.length === 0);
      const activeSerial = usable.some((d) => d.serial === options.serial) ? options.serial : usable[0]?.serial ?? "";
      setOptions((current) => ({ ...current, serial: activeSerial }));
      setNotice(usable.length ? { key: "devicesFound", values: { count: usable.length } } : { key: "noDevices" });

      if (activeSerial) {
        try {
          const isActive = await desktopApi.checkKeymapperStatus(activeSerial);
          setActivatedDevices((prev) => ({ ...prev, [activeSerial]: isActive }));
        } catch { /* ignore status check failure */ }
      }
    } catch (error) { setNotice({ raw: localizeBackendError(locale, error) }); } finally { setBusy(false); }
  }, [locale, refreshDevices, setMirror, options.serial]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    localStorage.setItem("panda-locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  // Sync activation status whenever serial changes
  useEffect(() => {
    if (!options.serial) return;
    void (async () => {
      try {
        const active = await desktopApi.checkKeymapperStatus(options.serial);
        setActivatedDevices((prev) => ({ ...prev, [options.serial]: active }));
      } catch { /* ignore */ }
    })();
  }, [options.serial]);
  
  useEffect(() => {
    if (hasExitedUnexpectedly) {
      setNotice({ key: "mirrorWindowExited" });
      setHasExitedUnexpectedly(false);
    }
  }, [hasExitedUnexpectedly, setHasExitedUnexpectedly]);

  const selected = useMemo(() => devices.find((device) => device.serial === options.serial), [devices, options.serial]);
  const ready = Boolean(environment?.adb.available && environment?.scrcpy.available && selected?.state === "device");
  const canActivateApps = Boolean(environment?.adb.available && selected?.state === "device");
  const isActivated = Boolean(options.serial && activatedDevices[options.serial]);
  const canStartMirror = ready && isActivated;

  async function toggleMirror() {
    setBusy(true);
    try {
      const state = mirror.running ? await desktopApi.stop() : await desktopApi.start(options);
      setMirror(state);
      const isStart = state.running;
      setNotice(isStart ? { key: "mirrorStarted", values: { pid: state.pid ?? "—" } } : { key: "mirrorStopped" });
      addToast({
        type: isStart ? "success" : "info",
        tag: "MIRROR",
        title: t("appTitle"),
        message: isStart ? t("mirrorStarted", { pid: state.pid ?? "—" }) : t("mirrorStopped"),
      });
    } catch (error) {
      const err = localizeBackendError(locale, error);
      setNotice({ raw: err });
      addToast({ type: "error", tag: "ERROR", message: err });
    } finally {
      setBusy(false);
    }
  }

  async function activateApps() {
    if (!options.serial) return;
    setBusy(true);
    setIsActivationModalOpen(true);
    setActivationStatus("running");
    setCurrentStepIndex(0);
    setActivationError(undefined);
    setActivationLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        message: `[ADB] Verificando conexión con dispositivo ${options.serial}...`,
        isError: false,
      },
    ]);
    setNotice({ key: "activatingApps" });

    // Step progression timers while backend executes
    const timer1 = setTimeout(() => {
      setCurrentStepIndex(1);
      setActivationLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `[TARGET] Buscando mapeador objetivo (${options.targetApp ?? "auto"})...`,
          isError: false,
        },
      ]);
    }, 700);

    const timer2 = setTimeout(() => {
      setCurrentStepIndex(2);
      setActivationLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `[APP] Lanzando app de mapeo en el dispositivo Android...`,
          isError: false,
        },
      ]);
    }, 1700);

    const timer3 = setTimeout(() => {
      setCurrentStepIndex(3);
      setActivationLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `[DAEMON] Inyectando script del servidor daemon sin root...`,
          isError: false,
        },
      ]);
    }, 3400);

    try {
      const res = await desktopApi.activateApps(options.serial, options.targetApp);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      setCurrentStepIndex(4);
      setActivationStatus("success");
      setActivationTargetName(res.appName);
      setActivationLogs(res.logs && res.logs.length > 0 ? res.logs : [
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `[SUCCESS] ¡Mapeador ${res.appName} activado con éxito!`,
          isError: false,
        },
      ]);
      setActivatedDevices((prev) => ({ ...prev, [options.serial]: true }));
      setNotice({ key: "activationCommandCompleted", values: { app: res.appName } });
      addToast({
        type: "success",
        tag: "KEYMAPPER",
        title: res.appName,
        message: t("activationStatusSuccess"),
      });
    } catch (error) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const errStr = localizeBackendError(locale, error);
      setActivationError(errStr);
      setActivationStatus("failed");
      setActivationLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          message: `[ERROR] ${errStr}`,
          isError: true,
        },
      ]);
      setNotice({ raw: errStr });
      addToast({
        type: "error",
        tag: "KEYMAPPER",
        message: errStr,
      });
    } finally {
      setBusy(false);
    }
  }

  async function deactivateApps() {
    if (!options.serial) return;
    setBusy(true);
    setNotice({ key: "deactivatingApps" });
    try {
      await desktopApi.deactivateApps(options.serial);
      setActivatedDevices((prev) => ({ ...prev, [options.serial]: false }));
      setNotice({ key: "deactivationCompleted" });
      addToast({
        type: "info",
        tag: "KEYMAPPER",
        message: t("deactivationCompleted"),
      });
    } catch (error) {
      const err = localizeBackendError(locale, error);
      setNotice({ raw: err });
      addToast({ type: "error", tag: "ERROR", message: err });
    } finally {
      setBusy(false);
    }
  }

  const nextLocale = locale === "es" ? "en" : locale === "en" ? "zh-CN" : "es";
  const localeLabel = locale === "es" ? "Español" : locale === "en" ? "English" : "中文";
  const message = "raw" in notice ? notice.raw : t(notice.key, notice.values);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">
          <AetherLogo size={46} />
        </div>
        <div className="brand-copy">
          <div className="brand-title-row">
            <h1>Aether Relay</h1>
            <span>v{packageMetadata.version}</span>
            <button type="button" className="lang-switcher" onClick={() => setLocale(nextLocale)}>
              <Globe size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
              {localeLabel}
            </button>
          </div>
          <p>{t("appDescriptionBefore")} <a href="https://github.com/Genymobile/scrcpy" target="_blank" rel="noreferrer">scrcpy</a>{t("appDescriptionAfter")}</p>
        </div>
        <div className={`connection-state ${ready ? "ready" : ""}`} aria-live="polite">
          <i />
          <span>{ready ? t("connected") : t("checkingEnvironment")}</span>
        </div>
      </header>
      <nav className="workspace-nav" aria-label="Navegación principal">
        <button className={activeView === "mirror" ? "active" : ""} onClick={() => setActiveView("mirror")}><MonitorPlay size={15} />{t("tabMirror")}</button>
        <button className={activeView === "performance" ? "active" : ""} onClick={() => setActiveView("performance")}><Activity size={15} />{t("tabPerformance")}</button>
        <button className={activeView === "preferences" ? "active" : ""} onClick={() => setActiveView("preferences")}><SlidersHorizontal size={15} />{t("tabPreferences")}</button>
      </nav>

      {activeView === "mirror" && <>
      <div className="layout">
        <section className="devices-panel">
          <DeviceList 
            devices={devices} 
            selectedSerial={options.serial} 
            onSelect={(serial) => setOptions(o => ({ ...o, serial }))} 
            onRefresh={refresh} 
            busy={busy} 
            showHelp={showDeviceHelp} 
            t={t} 
          />
          <div className="tool-status" style={{marginTop: 16}}>
            <div>
              <span className={environment?.adb.available ? "dot-ok" : "dot-bad"}/>
              <span>ADB</span>
              <small>{environment?.adb.available ? environment.adb.version : t("unavailable")}</small>
            </div>
            <div>
              <span className={environment?.scrcpy.available ? "dot-ok" : "dot-bad"}/>
              <span>scrcpy</span>
              <small>{environment?.scrcpy.available ? environment.scrcpy.version : t("unavailable")}</small>
            </div>
          </div>
        </section>

        <section className="settings-panel">
          <SettingsPanel 
            options={options} 
            setOptions={setOptions} 
            onOpenTransparency={() => setIsActivationModalOpen(true)}
            t={t} 
          />
        </section>
      </div>

      <ShortcutsPanel t={t} />

      <footer>
        <div className="footer-message">
          <i className={ready ? "ok" : ""}/>
          <span>{message}</span>
        </div>
        <div className="footer-actions">
          {/* Status pill & transparency preview trigger */}
          <button
            type="button"
            className={`keymapper-status-pill ${isActivated ? "active" : ""}`}
            onClick={() => setIsActivationModalOpen(true)}
            title={t("viewActivationLogs")}
          >
            <i />
            <span>{t(isActivated ? "keymapperActiveBadge" : "keymapperInactiveBadge")}</span>
          </button>

          {/* Deactivate button: ONLY shown if previously activated */}
          {isActivated && (
            <button 
              className="secondary danger-action" 
              onClick={() => void deactivateApps()} 
              disabled={busy || !canActivateApps} 
              title={t("deactivateApps")}
            >
              <ZapOff size={16}/>{t("deactivateApps")}
            </button>
          )}

          <button className="secondary" onClick={() => void activateApps()} disabled={busy || !canActivateApps}>
            <Zap size={16}/>{t("activateApps")}
          </button>

          {/* Mirror button: ONLY enabled once keymapper script is activated (or if already running to stop) */}
          <button 
            className={`primary ${mirror.running ? "danger" : canStartMirror ? "pulse-ready" : ""}`} 
            onClick={() => void toggleMirror()} 
            disabled={busy || (!mirror.running && !canStartMirror)}
            title={!mirror.running && !isActivated ? t("requireActivationFirst") : undefined}
          >
            {mirror.running ? <CircleStop size={17}/> : <MonitorPlay size={17}/>} 
            {mirror.running ? t("stopMirror") : t(options.virtualDisplay ? "startIndependentDisplay" : "startMirror")}
          </button>
        </div>
      </footer>
      </>}
      {activeView === "performance" && (
        <PerformancePanel
          t={t}
          selectedSerial={options.serial}
          selectedDeviceName={selected?.model || selected?.product || options.serial}
          onNotify={addToast}
        />
      )}
      {activeView === "preferences" && (
        <PreferencesPanel
          options={options}
          setOptions={setOptions}
          locale={locale}
          setLocale={setLocale}
          currentTheme={themeColor}
          onThemeChange={applyTheme}
          onNotify={addToast}
          t={t}
        />
      )}
      <FpsHud active={mirror.running} />

      {/* Activation Preview and Transparency Modal */}
      <ActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => setIsActivationModalOpen(false)}
        appName={activationTargetName || (options.targetApp === "auto" ? "Keymapper" : options.targetApp || "Keymapper")}
        serial={options.serial}
        status={activationStatus}
        currentStepIndex={currentStepIndex}
        logs={activationLogs}
        errorDetail={activationError}
        onRetry={() => void activateApps()}
        onStartMirror={canStartMirror ? () => void toggleMirror() : undefined}
        t={t}
      />

      {/* Non-native Aether Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
