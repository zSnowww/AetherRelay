import { AlertTriangle, CheckCircle2, Info, RefreshCw, Smartphone, Zap } from "lucide-react";
import type { DeviceMemoryStats, GameBoostResult } from "../../types";
import type { Translator } from "../../i18n";
import { formatMemory } from "./format";

interface PhoneMemoryCardProps {
  selectedSerial?: string;
  selectedDeviceName?: string;
  phoneStats: DeviceMemoryStats | null;
  phoneLoading: boolean;
  phoneError: string | null;
  hasPhoneProcesses: boolean;
  boostResult: GameBoostResult | null;
  boostingMemory: boolean;
  selectedCount: number;
  onBoost: () => void;
  t: Translator;
}

/** Phone RAM usage with the one-click "close selected apps" boost. */
export function PhoneMemoryCard({
  selectedSerial,
  selectedDeviceName,
  phoneStats,
  phoneLoading,
  phoneError,
  hasPhoneProcesses,
  boostResult,
  boostingMemory,
  selectedCount,
  onBoost,
  t,
}: PhoneMemoryCardProps) {
  const isPhoneHighMem = (phoneStats?.percentage ?? 0) >= 80;
  return (
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
                    <p>{hasPhoneProcesses ? t("phoneGameBoostDesc") : t("phoneGameBoostIdle")}</p>
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
                    disabled={boostingMemory || selectedCount === 0}
                    onClick={onBoost}
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
  );
}
