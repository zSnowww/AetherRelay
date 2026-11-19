import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { desktopApi } from "../api";
import { ConfirmModal } from "./ConfirmModal";
import type { DeviceMemoryStats, GameBoostResult, PhoneProcessInfo, SystemStats, ToastNotification } from "../types";
import { describeBackendError } from "../i18n";
import type { Translator } from "../i18n";
import { formatMemory } from "./performance/format";
import { PcMemoryCard } from "./performance/PcMemoryCard";
import { PcProcessList } from "./performance/PcProcessList";
import { PhoneMemoryCard } from "./performance/PhoneMemoryCard";
import { PhoneProcessTable } from "./performance/PhoneProcessTable";

interface PerformancePanelProps {
  t: Translator;
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
      setPcError(describeBackendError(t, reason));
    } finally {
      setPcLoading(false);
    }
  }, [t]);

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
      setPhoneError(describeBackendError(t, reason));
      setPhoneStats(null);
    } finally {
      setPhoneLoading(false);
    }
  }, [t]);

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
        message: describeBackendError(t, reason),
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
      const err = describeBackendError(t, reason);
      setPcError(err);
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: err,
      });
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
        message: describeBackendError(t, reason),
      });
    }
  }

  function toggleSelectAllOptimizable() {
    const optimizable = phoneProcesses.filter((process) => !process.protected);
    const allSelected = optimizable.length > 0 && optimizable.every((process) => selectedPackages.has(process.package));
    setSelectedPackages(allSelected ? new Set() : new Set(optimizable.map((p) => p.package)));
  }

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

      <div className="memory-grid">
        <PhoneMemoryCard
          selectedSerial={selectedSerial}
          selectedDeviceName={selectedDeviceName}
          phoneStats={phoneStats}
          phoneLoading={phoneLoading}
          phoneError={phoneError}
          hasPhoneProcesses={phoneProcesses.length > 0}
          boostResult={boostResult}
          boostingMemory={boostingMemory}
          selectedCount={selectedPackages.size}
          onBoost={() => setConfirmPhoneBoost(true)}
          t={t}
        />
        <PcMemoryCard pcStats={pcStats} t={t} />
      </div>

      {selectedSerial && (
        <PhoneProcessTable
          phoneProcesses={phoneProcesses}
          loading={phoneProcessesLoading}
          selectedPackages={selectedPackages}
          onToggle={togglePhoneProcess}
          onToggleAll={toggleSelectAllOptimizable}
          onClose={setPhoneAppToClose}
          t={t}
        />
      )}

      <PcProcessList pcStats={pcStats} onClose={setProcessToClose} t={t} />

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
