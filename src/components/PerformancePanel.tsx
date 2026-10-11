import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
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
import type { DeviceMemoryStats, GameBoostResult, PhoneProcessInfo, SystemStats, ToastNotification } from "../types";
import type { MessageKey } from "../i18n";

const formatMemory = (bytes: number) => {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  const mb = Math.round(bytes / 1024 / 1024);
  return `${mb} MB`;
};

function getAppInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAppGradient(pkg: string): string {
  let hash = 0;
  for (let i = 0; i < pkg.length; i++) {
    hash = (hash << 5) - hash + pkg.charCodeAt(i);
    hash |= 0;
  }
  const gradients = [
    "linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)",
    "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "linear-gradient(135deg, #F368E0 0%, #B53471 100%)",
    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    "linear-gradient(135deg, #0575E6 0%, #00F260 100%)",
    "linear-gradient(135deg, #b20a2c 0%, #ff6b6b 100%)",
    "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}

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

  const [phoneProcesses, setPhoneProcesses] = useState<PhoneProcessInfo[]>([]);
  const [phoneProcessesLoading, setPhoneProcessesLoading] = useState(false);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [boostingMemory, setBoostingMemory] = useState(false);
  const [boostResult, setBoostResult] = useState<GameBoostResult | null>(null);

  const [processToClose, setProcessToClose] = useState<{ pid: number; name: string } | null>(null);
  const [phoneAppToClose, setPhoneAppToClose] = useState<PhoneProcessInfo | null>(null);
  const [confirmPhoneBoost, setConfirmPhoneBoost] = useState(false);

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

  const refreshPhoneProcesses = useCallback(async (serial?: string) => {
    if (!serial) {
      setPhoneProcesses([]);
      setSelectedPackages(new Set());
      return;
    }
    setPhoneProcessesLoading(true);
    try {
      const processes = await desktopApi.listPhoneProcesses(serial);
      setPhoneProcesses(processes);
      setSelectedPackages((selected) => new Set(
        [...selected].filter((packageName) => processes.some((process) => process.package === packageName && !process.protected)),
      ));
    } catch {
      setPhoneProcesses([]);
    } finally {
      setPhoneProcessesLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refreshPc(),
      refreshPhone(selectedSerial),
      refreshPhoneProcesses(selectedSerial),
    ]);
  }, [refreshPc, refreshPhone, refreshPhoneProcesses, selectedSerial]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  function togglePhoneProcess(packageName: string) {
    setSelectedPackages((selected) => {
      const next = new Set(selected);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  }

  async function handleBoostPhoneMemory() {
    if (!selectedSerial || boostingMemory || selectedPackages.size === 0) return;
    setBoostingMemory(true);
    try {
      const result = await desktopApi.boostPhoneMemory(selectedSerial, [...selectedPackages]);
      setPhoneStats(result.after);
      setBoostResult(result);
      setSelectedPackages(new Set());
      await refreshPhoneProcesses(selectedSerial);
      const freedBytes = Math.max(0, result.after.availableBytes - result.before.availableBytes);
      onNotify?.({
        type: "success",
        tag: "BOOST",
        title: t("phoneGameBoostSuccess"),
        message: t("phoneGameBoostResult", {
          count: result.stoppedPackages.length,
          freed: formatMemory(freedBytes),
        }),
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

  const optimizablePhoneProcesses = phoneProcesses.filter((process) => !process.protected);
  const allOptimizableSelected =
    optimizablePhoneProcesses.length > 0 &&
    optimizablePhoneProcesses.every((process) => selectedPackages.has(process.package));

  function toggleSelectAllOptimizable() {
    if (allOptimizableSelected) {
      setSelectedPackages(new Set());
    } else {
      setSelectedPackages(new Set(optimizablePhoneProcesses.map((p) => p.package)));
    }
  }

  async function confirmClosePhoneApp() {
    if (!phoneAppToClose || !selectedSerial) return;
    const target = phoneAppToClose;
    setPhoneAppToClose(null);
    try {
      await desktopApi.killPhoneApps(selectedSerial, [target.package], true);
      await Promise.all([
        refreshPhone(selectedSerial),
        refreshPhoneProcesses(selectedSerial),
      ]);
      onNotify?.({
        type: "success",
        tag: "PROCESS",
        title: t("phoneProcessTerminateConfirmTitle"),
        message: t("phoneProcessClosed", { name: target.name }),
      });
    } catch (reason) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(reason),
      });
    }
  }

  const pcMemoryPercent = pcStats
    ? Math.round((pcStats.usedMemoryBytes / pcStats.totalMemoryBytes) * 100)
    : 0;

  const isPhoneHighMem = (phoneStats?.percentage ?? 0) >= 80;
  const selectedPhoneProcesses = phoneProcesses.filter((process) => selectedPackages.has(process.package));

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
          disabled={pcLoading || phoneLoading || phoneProcessesLoading}
        >
          <RefreshCw
            size={15}
            className={pcLoading || phoneLoading || phoneProcessesLoading ? "spin" : ""}
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
                    <p>{phoneProcesses.length > 0 ? t("phoneGameBoostDesc") : t("phoneGameBoostIdle")}</p>
                    {boostResult && (
                      <span className="boost-result">
                        {t("phoneGameBoostResult", {
                          count: boostResult.stoppedPackages.length,
                          freed: formatMemory(Math.max(0, boostResult.after.availableBytes - boostResult.before.availableBytes)),
                        })}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="boost-btn"
                    disabled={boostingMemory || selectedPackages.size === 0}
                    onClick={() => setConfirmPhoneBoost(true)}
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

      {/* Granular Android background app control */}
      {selectedSerial && (
        <div className="preset-apps-panel panel">
          <div className="preset-apps-header">
            <div className="section-title" style={{ margin: 0 }}>
              <div>
                <Layers size={17} />
                <h3>{t("phoneProcessesTitle")}</h3>
              </div>
            </div>
            <div className="preset-apps-badges">
              <span className={`preset-badge ${phoneProcesses.length > 0 ? "running" : "idle"}`}>
                <i className={phoneProcesses.length > 0 ? "dot-running" : "dot-idle"} />
                {t("appsRunningBadge", { count: phoneProcesses.length })}
              </span>
              <span className="preset-badge idle">
                {t("phoneProcessesSelected", { count: selectedPackages.size })}
              </span>
              {optimizablePhoneProcesses.length > 0 && (
                <button
                  type="button"
                  className="phone-select-all-btn"
                  onClick={toggleSelectAllOptimizable}
                >
                  {allOptimizableSelected ? t("phoneProcessDeselectAll") : t("phoneProcessSelectAll")}
                </button>
              )}
            </div>
          </div>
          <p className="process-note phone-processes-note">
            {t("phoneProcessesDesc")}
          </p>

          {phoneProcessesLoading ? (
            <div className="memory-status-box empty" style={{ marginTop: 12 }}>
              <RefreshCw size={14} className="spin" />
              <span>{t("calculating")}</span>
            </div>
          ) : phoneProcesses.length === 0 ? (
            <div className="memory-status-box empty" style={{ marginTop: 12 }}>
              <Info size={14} />
              <span>{t("phoneProcessesUnavailable")}</span>
            </div>
          ) : (
            <div className="phone-process-table">
              <div className="phone-process-column-headings" aria-hidden="true">
                <span />
                <span>{t("phoneProcessAppColumn")}</span>
                <span>{t("phoneProcessMemoryColumn")}</span>
                <span>{t("phoneProcessStatusColumn")}</span>
                <span>{t("phoneProcessActionsColumn")}</span>
              </div>
              <div className="process-list phone-process-list">
              {phoneProcesses.map((app) => (
                <div
                  key={app.package}
                  className={`process-row phone-process-row ${app.protected ? "protected" : ""}`}
                >
                  <div className="phone-app-icon-wrap">
                    {app.icon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        className="phone-app-icon"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="phone-app-avatar"
                        style={{ background: getAppGradient(app.package) }}
                      >
                        {getAppInitials(app.name)}
                      </div>
                    )}
                  </div>

                  <div className="process-name phone-process-name">
                    <div className="phone-process-title-row">
                      <strong>{app.name}</strong>
                      {app.pid != null && (
                        <span className="phone-process-pid">PID {app.pid}</span>
                      )}
                    </div>
                    <small title={app.package} className="phone-process-pkg">
                      {app.package}
                    </small>
                  </div>

                  <span className="phone-process-mem">
                    {formatMemory(app.memoryBytes)}
                  </span>

                  <span
                    className={`preset-badge ${app.protected ? "idle" : "selectable"}`}
                    title={app.protectionReason ?? undefined}
                  >
                    {app.protected ? t("phoneProcessProtected") : t("phoneProcessSelect")}
                  </span>

                  <div className="phone-process-actions">
                    <input
                      type="checkbox"
                      className="phone-process-select"
                      checked={selectedPackages.has(app.package)}
                      disabled={app.protected}
                      title={app.protected ? app.protectionReason ?? t("phoneProcessProtected") : t("phoneProcessSelect")}
                      aria-label={app.protected ? app.protectionReason ?? t("phoneProcessProtected") : t("phoneProcessSelect")}
                      onChange={() => togglePhoneProcess(app.package)}
                    />
                    <button
                      type="button"
                      className="process-close"
                      disabled={app.protected}
                      onClick={() => setPhoneAppToClose(app)}
                      title={
                        app.protected
                          ? app.protectionReason ?? t("phoneProcessProtected")
                          : t("closeProcessTitle", { name: app.name })
                      }
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
              </div>
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

      {/* Confirmation Modal: Terminate Individual Phone App */}
      <ConfirmModal
        isOpen={Boolean(phoneAppToClose)}
        title={t("phoneProcessTerminateConfirmTitle")}
        description={
          phoneAppToClose
            ? t("phoneProcessTerminateConfirm", {
                name: phoneAppToClose.name,
                pid: phoneAppToClose.pid ?? "—",
                package: phoneAppToClose.package,
              })
            : ""
        }
        badge={phoneAppToClose?.pid ? `PID ${phoneAppToClose.pid}` : phoneAppToClose?.package}
        badgeType="danger"
        confirmText={t("terminateProcess")}
        cancelText={t("cancel")}
        isDanger={true}
        onConfirm={() => void confirmClosePhoneApp()}
        onCancel={() => setPhoneAppToClose(null)}
      />

      {/* Confirmation Modal: close explicitly selected Android apps */}
      <ConfirmModal
        isOpen={confirmPhoneBoost}
        title={t("phoneGameBoost")}
        description={t("phoneProcessesConfirm", { apps: selectedPhoneProcesses.map((app) => app.name).join(", ") })}
        badge={t("phoneProcessesSelected", { count: selectedPhoneProcesses.length })}
        badgeType="danger"
        confirmText={t("phoneGameBoostBtn")}
        cancelText={t("cancel")}
        isDanger={true}
        onConfirm={() => {
          setConfirmPhoneBoost(false);
          void handleBoostPhoneMemory();
        }}
        onCancel={() => setConfirmPhoneBoost(false)}
      />
    </section>
  );
}
