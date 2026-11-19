import { Info, Layers, RefreshCw, X } from "lucide-react";
import type { PhoneProcessInfo } from "../../types";
import type { Translator } from "../../i18n";
import { formatMemory, getAppGradient, getAppInitials } from "./format";

interface PhoneProcessTableProps {
  phoneProcesses: PhoneProcessInfo[];
  loading: boolean;
  selectedPackages: Set<string>;
  onToggle: (packageName: string) => void;
  onToggleAll: () => void;
  onClose: (app: PhoneProcessInfo) => void;
  t: Translator;
}

/** Android apps by memory, with selection for the boost and per-app close. */
export function PhoneProcessTable({
  phoneProcesses,
  loading: phoneProcessesLoading,
  selectedPackages,
  onToggle,
  onToggleAll,
  onClose,
  t,
}: PhoneProcessTableProps) {
  const optimizablePhoneProcesses = phoneProcesses.filter((process) => !process.protected);
  const allOptimizableSelected =
    optimizablePhoneProcesses.length > 0 &&
    optimizablePhoneProcesses.every((process) => selectedPackages.has(process.package));

  return (
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
                  onClick={onToggleAll}
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
                      onChange={() => onToggle(app.package)}
                    />
                    <button
                      type="button"
                      className="process-close"
                      disabled={app.protected}
                      onClick={() => onClose(app)}
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
  );
}
