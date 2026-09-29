import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Flame,
  Info,
  Layers,
  MemoryStick,
  RefreshCw,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import { desktopApi } from "../api";
import { ConfirmModal } from "./ConfirmModal";
import type { DeviceMemoryStats, PresetAppInfo, SystemStats, ToastNotification } from "../types";
import type { MessageKey } from "../i18n";

const formatMemory = (bytes: number) => `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;

interface PerformancePanelProps {
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  selectedSerial?: string;
  selectedDeviceName?: string;
  onNotify?: (toast: Omit<ToastNotification, "id">) => void;
}

export function PerformancePanel({
  t,
  selectedSerial,
  selectedDeviceName,
  onNotify,
}: PerformancePanelProps) {
  const [pcStats, setPcStats] = useState<SystemStats | null>(null);
  const [pcLoading, setPcLoading] = useState(true);
  const [pcError, setPcError] = useState<string | null>(null);

  const [phoneStats, setPhoneStats] = useState<DeviceMemoryStats | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [presetApps, setPresetApps] = useState<PresetAppInfo[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(false);
  const [boostingMemory, setBoostingMemory] = useState(false);

  const [processToClose, setProcessToClose] = useState<{ pid: number; name: string } | null>(null);
  const [appToClose, setAppToClose] = useState<PresetAppInfo | null>(null);
  const [confirmKillAll, setConfirmKillAll] = useState(false);

  const refreshPc = useCallback(async () => {
    setPcLoading(true);
    try {
      setPcStats(await desktopApi.systemStats());
      setPcError(null);
    } catch (reason) {
      setPcError(String(reason));
    } finally {
      setPcLoading(false);
    }
  }, []);

  const refreshPhone = useCallback(async (serial?: string) => {
    if (!serial) {
      setPhoneStats(null);
      setPhoneError(null);
      return;
    }
    setPhoneLoading(true);
    try {
      const stats = await desktopApi.deviceMemory(serial);
      setPhoneStats(stats);
      setPhoneError(null);
    } catch (reason) {
      setPhoneError(String(reason));
      setPhoneStats(null);
    } finally {
      setPhoneLoading(false);
    }
  }, []);

  const refreshPresets = useCallback(async (serial?: string) => {
    if (!serial) {
      setPresetApps([]);
      return;
    }
    setPresetsLoading(true);
    try {
      const apps = await desktopApi.listPresetApps(serial);
      setPresetApps(apps);
    } catch {
      setPresetApps([]);
    } finally {
      setPresetsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshPc(),
      refreshPhone(selectedSerial),
      refreshPresets(selectedSerial),
    ]);
  }, [refreshPc, refreshPhone, refreshPresets, selectedSerial]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // Phone Game Boost: 1-click RAM cleaner & cache trimmer
  async function handleBoostPhoneMemory() {
    if (!selectedSerial || boostingMemory) return;
    setBoostingMemory(true);
    try {
      const updatedStats = await desktopApi.boostPhoneMemory(selectedSerial);
      setPhoneStats(updatedStats);
      await refreshPresets(selectedSerial);
      onNotify?.({
        type: "success",
        tag: "BOOST",
        title: t("phoneGameBoostSuccess"),
        message: `${t("freeMemory", { free: formatMemory(updatedStats.availableBytes) })} (${updatedStats.percentage}% ${t("memoryInUse")})`,
      });
    } catch (reason) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(reason),
      });
    } finally {
      setBoostingMemory(false);
    }
  }

  // Close a single preset app on Android
  async function confirmKillSingleApp() {
    if (!selectedSerial || !appToClose) return;
    const target = appToClose;
    setAppToClose(null);
    try {
      const updatedStats = await desktopApi.killPhoneApps(selectedSerial, [target.package], true);
      setPhoneStats(updatedStats);
      await refreshPresets(selectedSerial);
      onNotify?.({
        type: "info",
        tag: "OPTIMIZER",
        title: t("appClosedNotice", { name: target.name }),
        message: target.package,
      });
    } catch (reason) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(reason),
      });
    }
  }

  // Close all running preset apps in batch
  async function confirmKillAllRunning() {
    if (!selectedSerial) return;
    const runningList = presetApps.filter((a) => a.installed && a.running);
    if (runningList.length === 0) return;
    setConfirmKillAll(false);
    try {
      const packages = runningList.map((a) => a.package);
      const updatedStats = await desktopApi.killPhoneApps(selectedSerial, packages, true);
      setPhoneStats(updatedStats);
      await refreshPresets(selectedSerial);
      onNotify?.({
        type: "success",
        tag: "OPTIMIZER",
        title: t("phoneGameBoostSuccess"),
        message: `${runningList.length} apps terminadas en segundo plano`,
      });
    } catch (reason) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(reason),
      });
    }
  }

  // Terminate PC process
  async function confirmCloseProcess() {
    if (!processToClose) return;
    const target = processToClose;
    setProcessToClose(null);
    try {
      await desktopApi.terminateProcess(target.pid);
      await refreshPc();
      onNotify?.({
        type: "success",
        tag: "PROCESS",
        title: t("confirmCloseTitle"),
        message: `${target.name} (PID ${target.pid})`,
      });
    } catch (reason) {
      const err = String(reason);
      setPcError(err);
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: err,
      });
    }
  }

  const pcMemoryPercent = pcStats
    ? Math.round((pcStats.usedMemoryBytes / pcStats.totalMemoryBytes) * 100)
    : 0;

  const isPhoneHighMem = (phoneStats?.percentage ?? 0) >= 80;
  const installedPresets = presetApps.filter((a) => a.installed);
  const runningPresets = installedPresets.filter((a) => a.running);

  return (
    <section className="performance-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">{t("performanceEyebrow")}</span>
          <h2>{t("performanceTitle")}</h2>
          <p>{t("performanceSubtitle")}</p>
        </div>
        <button
          className="secondary"
          onClick={() => void refreshAll()}
          disabled={pcLoading || phoneLoading || presetsLoading}
        >
          <RefreshCw
            size={15}
            className={pcLoading || phoneLoading || presetsLoading ? "spin" : ""}
          />
          {t("refreshButton")}
        </button>
      </div>

      {pcError && <div className="system-error" style={{ marginBottom: 14 }}>{pcError}</div>}

      {/* Dual RAM Monitoring: Phone & PC */}
      <div className="memory-grid">
        {/* Card 1: Phone RAM (Celular / Android) */}
        <div className="memory-card panel">
          <div className="memory-card-header">
            <div className="memory-card-title">
              <div className="memory-icon">
                <Smartphone size={20} />
              </div>
              <div>
                <h3>{t("phoneMemoryTitle")}</h3>
                <span>
                  {selectedSerial
                    ? t("phoneMemoryDevice", { device: selectedDeviceName || selectedSerial })
                    : t("noDeviceSelectedForMemory")}
                </span>
              </div>
            </div>
            {selectedSerial && (
              <span className="memory-device-badge">
                <Smartphone size={12} />
                {selectedSerial}
              </span>
            )}
          </div>

          {selectedSerial ? (
            phoneStats ? (
              <>
                <div className="memory-stats-row">
                  <div>
                    <span>{t("memoryInUse")}</span>
                    <strong>
                      {`${formatMemory(phoneStats.usedBytes)} / ${formatMemory(phoneStats.totalBytes)}`}
                    </strong>
                  </div>
                  <em className={isPhoneHighMem ? "warn" : ""}>{phoneStats.percentage}%</em>
                </div>

                <div className="memory-meter" aria-label={`${phoneStats.percentage}%`}>
                  <i
                    style={{ width: `${phoneStats.percentage}%` }}
                    className={isPhoneHighMem ? "warn" : ""}
                  />
                </div>

                <div className="memory-stats-row">
                  <span>
                    {t("freeMemory", { free: formatMemory(phoneStats.availableBytes) })}
                  </span>
                </div>

                <div className={`memory-status-box ${isPhoneHighMem ? "warn" : "optimal"}`}>
                  {isPhoneHighMem ? (
                    <>
                      <AlertTriangle size={15} />
                      <span>{t("phoneMemoryWarning")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>{t("phoneMemoryOptimal")}</span>
                    </>
                  )}
                </div>

                {/* 1-Click Game Boost Bar */}
                <div className="boost-action-bar">
                  <div className="boost-action-info">
                    <strong>{t("phoneGameBoost")}</strong>
                    <p>{t("phoneGameBoostDesc")}</p>
                  </div>
                  <button
                    type="button"
                    className="boost-btn"
                    disabled={boostingMemory}
                    onClick={() => void handleBoostPhoneMemory()}
                  >
                    <Zap size={13} className={boostingMemory ? "spin" : ""} />
                    {boostingMemory ? t("phoneGameBoostRunning") : t("phoneGameBoostBtn")}
                  </button>
                </div>
              </>
            ) : phoneLoading ? (
              <div className="memory-status-box empty">
                <RefreshCw size={14} className="spin" />
                <span>{t("calculating")}</span>
              </div>
            ) : (
              <div className="memory-status-box warn">
                <AlertTriangle size={15} />
                <span>{phoneError || t("phoneMemoryUnavailable")}</span>
              </div>
            )
          ) : (
            <div className="memory-status-box empty">
              <Info size={15} />
              <span>{t("noDeviceSelectedForMemory")}</span>
            </div>
          )}

          <div className="memory-explainer-banner">
            <Info size={14} />
            <span>{t("phoneMemoryImpactExplainer")}</span>
          </div>
        </div>

        {/* Card 2: PC Host RAM (Computadora) */}
        <div className="memory-card panel">
          <div className="memory-card-header">
            <div className="memory-card-title">
              <div className="memory-icon">
                <Cpu size={20} />
              </div>
              <div>
                <h3>{t("pcMemoryTitle")}</h3>
                <span>{t("performanceSubtitle")}</span>
              </div>
            </div>
            <span className="memory-device-badge">
              <MemoryStick size={12} />
              Host PC
            </span>
          </div>

          <div className="memory-stats-row">
            <div>
              <span>{t("memoryInUse")}</span>
              <strong>
                {pcStats
                  ? `${formatMemory(pcStats.usedMemoryBytes)} / ${formatMemory(pcStats.totalMemoryBytes)}`
                  : t("calculating")}
              </strong>
            </div>
            <em>{pcMemoryPercent}%</em>
          </div>

          <div className="memory-meter" aria-label={`${pcMemoryPercent}%`}>
            <i style={{ width: `${pcMemoryPercent}%` }} />
          </div>

          <div className="memory-stats-row">
            <span>
              {pcStats
                ? t("freeMemory", {
                    free: formatMemory(pcStats.totalMemoryBytes - pcStats.usedMemoryBytes),
                  })
                : "—"}
            </span>
          </div>

          <div className="memory-status-box optimal">
            <CheckCircle2 size={15} />
            <span>
              {t("processesVisible", { count: pcStats?.processes.length ?? 0 })}
            </span>
          </div>
        </div>
      </div>

      {/* Preset Heavy Background Apps on Phone */}
      {selectedSerial && (
        <div className="preset-apps-panel panel">
          <div className="preset-apps-header">
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <Layers size={17} />
                <h3>{t("presetAppsTitle")}</h3>
              </div>
            </div>
            <div className="preset-apps-badges">
              <span className={`preset-badge ${runningPresets.length > 0 ? "running" : "idle"}`}>
                <i className={runningPresets.length > 0 ? "dot-running" : "dot-idle"} />
                {t("appsRunningBadge", { count: runningPresets.length })}
              </span>
              <span className="preset-badge idle">
                {t("appsInstalledBadge", { count: installedPresets.length })}
              </span>
              <button
                type="button"
                className="secondary danger-action"
                style={{ minHeight: "30px", padding: "0 10px", fontSize: "10.5px" }}
                disabled={runningPresets.length === 0}
                onClick={() => setConfirmKillAll(true)}
              >
                <Flame size={13} />
                {t("killAllRunningPresets")}
              </button>
            </div>
          </div>
          <p className="process-note" style={{ margin: "4px 0 10px" }}>
            {t("presetAppsDesc")}
          </p>

          {installedPresets.length === 0 ? (
            <div className="memory-status-box empty" style={{ marginTop: 12 }}>
              <Info size={14} />
              <span>{t("noPresetAppsDetected")}</span>
            </div>
          ) : (
            <div className="preset-apps-grid">
              {installedPresets.map((app) => (
                <div
                  key={app.id}
                  className={`preset-app-card ${app.running ? "running" : ""}`}
                >
                  <div className="preset-app-info">
                    <strong>{app.name}</strong>
                    <small>{app.package}</small>
                  </div>
                  <div className="preset-app-actions">
                    <span className={`preset-badge ${app.running ? "running" : "idle"}`}>
                      <i className={app.running ? "dot-running" : "dot-idle"} />
                      {app.running ? "Activa" : "Detenida"}
                    </span>
                    <button
                      type="button"
                      className="app-kill-btn"
                      disabled={!app.running}
                      title={app.running ? t("killSelectedApp") : undefined}
                      onClick={() => setAppToClose(app)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PC Processes List */}
      <div className="process-panel panel">
        <div className="section-title">
          <div>
            <MemoryStick size={18} />
            <h3>{t("processesByMemory")}</h3>
          </div>
          <span>{t("processesVisible", { count: pcStats?.processes.length ?? 0 })}</span>
        </div>
        <p className="process-note">{t("processNote")}</p>
        <div className="process-list">
          {pcStats?.processes.map((process) => (
            <div className="process-row" key={process.pid}>
              <div className="process-name">
                <strong>{process.name}</strong>
                <small title={process.command}>{process.command}</small>
              </div>
              <span>{formatMemory(process.memoryBytes)}</span>
              <small>PID {process.pid}</small>
              <button
                className="process-close"
                onClick={() => setProcessToClose({ pid: process.pid, name: process.name })}
                title={t("closeProcessTitle", { name: process.name })}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal: Terminate Host PC Process */}
      <ConfirmModal
        isOpen={Boolean(processToClose)}
        title={t("confirmCloseTitle")}
        description={
          processToClose
            ? t("confirmClose", { name: processToClose.name, pid: processToClose.pid })
            : ""
        }
        badge={processToClose ? `PID ${processToClose.pid}` : undefined}
        badgeType="danger"
        confirmText={t("terminateProcess")}
        cancelText={t("cancel")}
        isDanger={true}
        onConfirm={() => void confirmCloseProcess()}
        onCancel={() => setProcessToClose(null)}
      />

      {/* Confirmation Modal: Force-stop Single Android App */}
      <ConfirmModal
        isOpen={Boolean(appToClose)}
        title={t("killSelectedApp")}
        description={
          appToClose
            ? `¿Deseas forzar el cierre de ${appToClose.name} (${appToClose.package}) en el celular? Se liberará su consumo de memoria RAM.`
            : ""
        }
        badge={appToClose?.name}
        badgeType="danger"
        confirmText={t("terminateProcess")}
        cancelText={t("cancel")}
        isDanger={true}
        onConfirm={() => void confirmKillSingleApp()}
        onCancel={() => setAppToClose(null)}
      />

      {/* Confirmation Modal: Force-stop All Running Android Preset Apps */}
      <ConfirmModal
        isOpen={confirmKillAll}
        title={t("killAllRunningPresets")}
        description={`¿Deseas forzar el cierre de todas las apps pesadas activas en segundo plano (${runningPresets.map((a) => a.name).join(", ")}) en tu celular?`}
        badge={`${runningPresets.length} apps`}
        badgeType="danger"
        confirmText={t("killAllRunningPresets")}
        cancelText={t("cancel")}
        isDanger={true}
        onConfirm={() => void confirmKillAllRunning()}
        onCancel={() => setConfirmKillAll(false)}
      />
    </section>
  );
}
