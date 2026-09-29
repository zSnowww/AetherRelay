import React, { useState, useEffect, useRef } from "react";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Terminal, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw, 
  X, 
  MonitorPlay,
  Lock,
  Cpu,
  RotateCcw,
  Code
} from "lucide-react";
import type { ActivationLog } from "../types";
import type { MessageKey } from "../i18n";

export interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  serial: string;
  status: "idle" | "running" | "success" | "failed";
  currentStepIndex: number;
  logs: ActivationLog[];
  errorDetail?: string;
  onRetry: () => void;
  onStartMirror?: () => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

export function ActivationModal({
  isOpen,
  onClose,
  appName,
  serial,
  status,
  currentStepIndex,
  logs,
  errorDetail,
  onRetry,
  onStartMirror,
  t,
}: ActivationModalProps) {
  const [activeTab, setActiveTab] = useState<"console" | "transparency">("console");
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Timer while running
  useEffect(() => {
    let interval: number | undefined;
    if (status === "running") {
      setElapsed(0);
      interval = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [status]);

  // Auto-scroll console
  useEffect(() => {
    if (activeTab === "console" && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, activeTab]);

  if (!isOpen) return null;

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.message}`).join("\n");
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps: { key: MessageKey; label: string }[] = [
    { key: "stepAdb", label: t("stepAdb") },
    { key: "stepDetect", label: t("stepDetect") },
    { key: "stepLaunch", label: t("stepLaunch") },
    { key: "stepInject", label: t("stepInject") },
    { key: "stepVerify", label: t("stepVerify") },
  ];

  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="activation-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-row">
            <div className={`modal-badge ${status}`}>
              {status === "running" && <Loader2 size={16} className="spin" />}
              {status === "success" && <CheckCircle2 size={16} />}
              {status === "failed" && <XCircle size={16} />}
              {status === "idle" && <Terminal size={16} />}
              <span>{t("activationModalTitle")}</span>
            </div>
            {appName && <span className="modal-app-tag">{appName}</span>}
            {serial && <span className="modal-serial-tag">{serial}</span>}
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose} 
            disabled={status === "running"}
            aria-label={t("close")}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="modal-tabs">
          <button 
            type="button" 
            className={`modal-tab ${activeTab === "console" ? "active" : ""}`}
            onClick={() => setActiveTab("console")}
          >
            <Terminal size={14} />
            <span>{t("tabLiveConsole")}</span>
            {logs.length > 0 && <span className="tab-pill">{logs.length}</span>}
          </button>
          <button 
            type="button" 
            className={`modal-tab ${activeTab === "transparency" ? "active" : ""}`}
            onClick={() => setActiveTab("transparency")}
          >
            <ShieldCheck size={14} />
            <span>{t("tabTransparency")}</span>
          </button>
        </div>

        {/* Tab 1: Live Console & Progress */}
        {activeTab === "console" && (
          <div className="modal-body console-view">
            {/* Stepper tracker */}
            <div className="stepper-container" aria-label="Progreso de activación">
              {steps.map((st, idx) => {
                const isDone = currentStepIndex > idx || status === "success";
                const isCurrent = currentStepIndex === idx && status === "running";
                const isError = currentStepIndex === idx && status === "failed";

                return (
                  <div 
                    key={st.key} 
                    className={`step-item ${isDone ? "done" : ""} ${isCurrent ? "current" : ""} ${isError ? "error" : ""}`}
                  >
                    <div className="step-marker">
                      {isDone && <Check size={12} strokeWidth={3} />}
                      {isCurrent && <Loader2 size={12} className="spin" />}
                      {isError && <X size={12} strokeWidth={3} />}
                      {!isDone && !isCurrent && !isError && <span>{idx + 1}</span>}
                    </div>
                    <span className="step-label">{st.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Status notification banner */}
            {status === "running" && (
              <div className="activation-banner running">
                <Loader2 size={16} className="spin" />
                <div className="banner-copy">
                  <strong>{t("activationStatusRunning")}</strong>
                  <span>{t("elapsedTime")}: {formatElapsed(elapsed)}</span>
                </div>
              </div>
            )}

            {status === "success" && (
              <div className="activation-banner success">
                <CheckCircle2 size={18} />
                <div className="banner-copy">
                  <strong>{t("activationStatusSuccess")}</strong>
                  <span>{t("activationCommandCompleted", { app: appName || "Keymapper" })}</span>
                </div>
              </div>
            )}

            {status === "failed" && (
              <div className="activation-banner error">
                <XCircle size={18} />
                <div className="banner-copy">
                  <strong>{t("activationStatusFailed")}</strong>
                  <span>{errorDetail || t("activateAppFailed", { detail: "Unknown error" })}</span>
                </div>
              </div>
            )}

            {/* Terminal Console Box */}
            <div className="terminal-wrapper">
              <div className="terminal-bar">
                <div className="terminal-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
                <div className="terminal-title">
                  <code>adb shell: {appName || "Keymapper"}</code>
                </div>
                <button 
                  type="button" 
                  className="terminal-copy-btn" 
                  onClick={handleCopyLogs}
                  title={t("copyLogs")}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? t("logsCopied") : t("copyLogs")}</span>
                </button>
              </div>
              <div className="terminal-logs">
                {logs.length === 0 ? (
                  <div className="terminal-empty">
                    <Loader2 size={16} className="spin" />
                    <span>Iniciando comunicación con el dispositivo...</span>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`log-line ${log.isError ? "error" : ""}`}>
                      <span className="log-time">{log.timestamp}</span>
                      <span className="log-msg">{log.message}</span>
                    </div>
                  ))
                )}
                <div ref={consoleBottomRef} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Security & Transparency Details */}
        {activeTab === "transparency" && (
          <div className="modal-body transparency-view">
            <div className="transparency-hero">
              <ShieldCheck size={28} className="hero-icon" />
              <div>
                <h4>{t("transparencyBadge")}</h4>
                <p>{t("transparencyHeroDesc")}</p>
              </div>
            </div>

            <div className="transparency-cards">
              <div className="transparency-card">
                <div className="card-header">
                  <Lock size={16} />
                  <h5>{t("transparencyPoint2Title")}</h5>
                </div>
                <p>{t("transparencyPoint2Desc")}</p>
              </div>

              <div className="transparency-card">
                <div className="card-header">
                  <Cpu size={16} />
                  <h5>{t("transparencyPoint3Title")}</h5>
                </div>
                <p>{t("transparencyPoint3Desc")}</p>
              </div>

              <div className="transparency-card">
                <div className="card-header">
                  <RotateCcw size={16} />
                  <h5>{t("transparencyPoint4Title")}</h5>
                </div>
                <p>{t("transparencyPoint4Desc")}</p>
              </div>

              <div className="transparency-card">
                <div className="card-header">
                  <Code size={16} />
                  <h5>{t("transparencyCommandsTitle")}</h5>
                </div>
                <p style={{ whiteSpace: "pre-line" }}>{t("transparencyCommandsDesc")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <div className="footer-left">
            <button 
              type="button" 
              className="modal-secondary-link"
              onClick={() => setActiveTab(activeTab === "console" ? "transparency" : "console")}
            >
              {activeTab === "console" ? (
                <>
                  <ShieldCheck size={14} />
                  <span>{t("tabTransparency")}</span>
                </>
              ) : (
                <>
                  <Terminal size={14} />
                  <span>{t("tabLiveConsole")}</span>
                </>
              )}
            </button>
          </div>

          <div className="footer-right">
            {status === "failed" && (
              <button type="button" className="secondary" onClick={onRetry}>
                <RefreshCw size={14} />
                <span>{t("retry")}</span>
              </button>
            )}

            {status === "success" && onStartMirror && (
              <button 
                type="button" 
                className="primary pulse-ready" 
                onClick={() => {
                  onClose();
                  onStartMirror();
                }}
              >
                <MonitorPlay size={16} />
                <span>{t("startMirrorNow")}</span>
              </button>
            )}

            <button 
              type="button" 
              className="secondary" 
              onClick={onClose} 
              disabled={status === "running"}
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
