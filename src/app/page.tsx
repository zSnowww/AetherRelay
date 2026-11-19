"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleStop, Globe, MonitorPlay, Zap, ZapOff, Activity, SlidersHorizontal, Gauge } from "lucide-react";
import { desktopApi } from "../api";
import { describeBackendError } from "../i18n";
import packageMetadata from "../../package.json";
import { useActivation, type Notice } from "../hooks/useActivation";
import { useDevices } from "../hooks/useDevices";
import { useLocale } from "../hooks/useLocale";
import { useMirror } from "../hooks/useMirror";
import { useOptions } from "../hooks/useOptions";
import { useStutterShortcuts } from "../hooks/useStutterShortcuts";
import { useTheme } from "../hooks/useTheme";
import { useToasts } from "../hooks/useToasts";

import { DeviceList } from "../components/DeviceList";
import { SettingsPanel } from "../components/SettingsPanel";
import { ShortcutsPanel } from "../components/ShortcutsPanel";
import { PerformancePanel } from "../components/PerformancePanel";
import { PreferencesPanel } from "../components/PreferencesPanel";
import { DiagnosticsPanel } from "../components/DiagnosticsPanel";
import { FpsHud } from "../components/FpsHud";
import { ActivationModal } from "../components/ActivationModal";
import { ToastContainer } from "../components/ToastContainer";
import { AetherLogo } from "../components/AetherLogo";
import type { EnvironmentStatus } from "../types";

type View = "mirror" | "performance" | "preferences" | "diagnostics";

export default function Page() {
  const { locale, setLocale, t } = useLocale();
  const { themeColor, applyTheme } = useTheme();
  const { toasts, addToast, dismissToast } = useToasts();
  const [options, setOptions] = useOptions();
  const { devices, refreshDevices } = useDevices();
  const { mirror, setMirror, hasExitedUnexpectedly, setHasExitedUnexpectedly } = useMirror();

  const [environment, setEnvironment] = useState<EnvironmentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDeviceHelp, setShowDeviceHelp] = useState(false);
  const [activeView, setActiveView] = useState<View>("mirror");
  const [notice, setNotice] = useState<Notice>({ key: "checkingEnvironment" });

  const activation = useActivation({
    serial: options.serial,
    targetApp: options.targetApp,
    t,
    addToast,
    setNotice,
    setBusy,
  });
  const { refreshStatus } = activation;

  useStutterShortcuts(addToast, t);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      setEnvironment(await desktopApi.environment());
      const found = await refreshDevices();
      setMirror(await desktopApi.state());

      const usable = found.filter((device) => device.state === "device");
      setShowDeviceHelp(usable.length === 0);
      const activeSerial = usable.some((d) => d.serial === options.serial) ? options.serial : usable[0]?.serial ?? "";
      setOptions((current) => ({ ...current, serial: activeSerial }));
      setNotice(usable.length ? { key: "devicesFound", values: { count: usable.length } } : { key: "noDevices" });
      await refreshStatus(activeSerial);
    } catch (error) {
      setNotice({ raw: describeBackendError(t, error) });
    } finally {
      setBusy(false);
    }
  }, [t, refreshDevices, setMirror, options.serial, setOptions, refreshStatus]);

  useEffect(() => { void refresh(); }, [refresh]);

  // Keep a usable device selected whenever the device list changes.
  useEffect(() => {
    const usable = devices.filter((device) => device.state === "device");
    setShowDeviceHelp(usable.length === 0);
    setOptions((current) => {
      if (usable.some((d) => d.serial === current.serial)) return current;
      const nextSerial = usable[0]?.serial ?? "";
      return nextSerial !== current.serial ? { ...current, serial: nextSerial } : current;
    });
    if (usable.length > 0) {
      setNotice({ key: "devicesFound", values: { count: usable.length } });
    }
  }, [devices, setOptions]);

  useEffect(() => {
    if (hasExitedUnexpectedly) {
      setNotice({ key: "mirrorWindowExited" });
      setHasExitedUnexpectedly(false);
    }
  }, [hasExitedUnexpectedly, setHasExitedUnexpectedly]);

  const selected = useMemo(() => devices.find((device) => device.serial === options.serial), [devices, options.serial]);
  const ready = Boolean(environment?.adb.available && environment?.scrcpy.available && selected?.state === "device");
  const canActivateApps = Boolean(environment?.adb.available && selected?.state === "device");
  const isActivated = activation.isActivated;
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
      const err = describeBackendError(t, error);
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
        <button className={activeView === "diagnostics" ? "active" : ""} onClick={() => setActiveView("diagnostics")}><Gauge size={15} />{t("tabDiagnostics")}</button>
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
            onOpenTransparency={activation.modal.open}
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
            onClick={activation.modal.open}
            title={t("viewActivationLogs")}
          >
            <i />
            <span>{t(isActivated ? "keymapperActiveBadge" : "keymapperInactiveBadge")}</span>
          </button>

          {/* Deactivate button: ONLY shown if previously activated */}
          {isActivated && (
            <button 
              className="secondary danger-action" 
              onClick={() => void activation.deactivate()} 
              disabled={busy || !canActivateApps} 
              title={t("deactivateApps")}
            >
              <ZapOff size={16}/>{t("deactivateApps")}
            </button>
          )}

          <button className="secondary" onClick={() => void activation.activate()} disabled={busy || !canActivateApps}>
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
      {activeView === "diagnostics" && (
        <DiagnosticsPanel
          t={t}
          selectedSerial={options.serial}
          options={options}
          setOptions={setOptions}
          mirrorRunning={mirror.running}
          onNotify={addToast}
        />
      )}
      <FpsHud active={mirror.running} />

      {/* Activation Preview and Transparency Modal */}
      <ActivationModal
        isOpen={activation.modal.isOpen}
        onClose={activation.modal.close}
        appName={activation.modal.targetName || (options.targetApp === "auto" ? "Keymapper" : options.targetApp || "Keymapper")}
        serial={options.serial}
        status={activation.modal.status}
        currentStepIndex={activation.modal.stepIndex}
        logs={activation.modal.logs}
        errorDetail={activation.modal.error}
        onRetry={() => void activation.activate()}
        onStartMirror={canStartMirror ? () => void toggleMirror() : undefined}
        t={t}
      />

      {/* Non-native Aether Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
