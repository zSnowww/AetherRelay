import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Cpu,
  Download,
  Flame,
  Gauge,
  HelpCircle,
  Layers,
  Monitor,
  RefreshCw,
  Sliders,
  Terminal,
  Trash2,
  Usb,
  Zap,
} from "lucide-react";
import { desktopApi, onStutterMarked } from "../api";
import type {
  MirrorOptions,
  ProbeStatus,
  ScrcpyLogEntry,
  SessionDiagnostics,
  SessionSample,
  StutterBookmark,
  ThermalStatus,
  ToastNotification,
} from "../types";
import type { MessageKey } from "../i18n";

interface DiagnosticsPanelProps {
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  selectedSerial?: string;
  options: MirrorOptions;
  setOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  mirrorRunning: boolean;
  onNotify?: (toast: Omit<ToastNotification, "id">) => void;
}

export function DiagnosticsPanel({
  t,
  selectedSerial,
  options,
  setOptions,
  mirrorRunning,
  onNotify,
}: DiagnosticsPanelProps) {
  const [session, setSession] = useState<SessionDiagnostics | null>(null);
  const [samples, setSamples] = useState<SessionSample[]>([]);
  const [bookmarks, setBookmarks] = useState<StutterBookmark[]>([]);
  const [logs, setLogs] = useState<ScrcpyLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<"all" | "warn" | "encoder">("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const logConsoleRef = useRef<HTMLDivElement>(null);

  // ── Poll In-Memory Diagnostics Snapshot (Lightweight, 0 overhead) ─────────
  const fetchTelemetry = useCallback(async () => {
    try {
      const diag = await desktopApi.sessionDiagnostics();
      setSession(diag);
      const recSamples = await desktopApi.sessionSamples(60);
      setSamples(recSamples);
      const bmarks = await desktopApi.stutterBookmarks();
      setBookmarks(bmarks);
      const recentLogs = await desktopApi.scrcpyLogs(300);
      setLogs(recentLogs);
    } catch {
      // Ignore polling errors while app is idle
    }
  }, []);

  useEffect(() => {
    void fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 1500);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Listen for global compositor mark-stutter triggers via IPC / Tauri event
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void onStutterMarked(() => {
      void fetchTelemetry();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [fetchTelemetry]);

  // Auto-scroll log console
  useEffect(() => {
    if (autoScroll && logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // ── Mark Stutter Action ───────────────────────────────────────────────────
  const handleMarkStutter = useCallback(async () => {
    setIsMarking(true);
    try {
      const mark = await desktopApi.markStutter();
      if (mark) {
        onNotify?.({
          type: "warning",
          tag: "STUTTER",
          title: t("markStutterButton"),
          message: t("stutterMarkedNotice"),
        });
        await fetchTelemetry();
      }
    } catch (e) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(e),
      });
    } finally {
      setTimeout(() => setIsMarking(false), 600);
    }
  }, [fetchTelemetry, onNotify, t]);

  // ── Apply Baseline Preset (8 Mbps, 60fps, H.264, buffer 0, audio OFF) ─────
  const applyBaselinePreset = useCallback(() => {
    setOptions((prev) => ({
      ...prev,
      maxSize: 1920,
      maxFps: 60,
      videoCodec: "h264",
      videoBitRateMbps: 8,
      audio: false,
      videoBufferMs: 0,
      turnScreenOff: true,
      stayAwake: true,
    }));
    onNotify?.({
      type: "success",
      tag: "BASELINE",
      title: t("baselinePresetTitle"),
      message: t("baselineApplied"),
    });
  }, [onNotify, setOptions, t]);

  // ── Export Diagnostics JSON (Redacted) ────────────────────────────────────
  const exportDiagnosticsJson = useCallback(async () => {
    try {
      const json = await desktopApi.exportDiagnostics(logs);

      // Decouple clipboard write from file download so permission issues never block download
      try {
        await navigator.clipboard.writeText(json);
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      } catch {
        // Clipboard write can fail in un-focused webviews or Wayland compositors
      }

      // Create download blob
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aether-diagnostics-${session?.metadata.sessionId || "report"}.json`;
      a.click();
      URL.revokeObjectURL(url);

      onNotify?.({
        type: "success",
        tag: "EXPORT",
        title: t("exportDiagnosticsButton"),
        message: t("exportSuccess"),
      });
    } catch (e) {
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(e),
      });
    }
  }, [logs, onNotify, session?.metadata.sessionId, t]);

  // ── Copy Logs ─────────────────────────────────────────────────────────────
  const handleCopyLogs = useCallback(async () => {
    try {
      const text = logs
        .map((l) => `[${l.elapsedMs}ms][${l.source.toUpperCase()}][${l.level.toUpperCase()}] ${l.message}`)
        .join("\n");
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {
      // ignore
    }
  }, [logs]);

  // ── Clear Logs ────────────────────────────────────────────────────────────
  const handleClearLogs = useCallback(async () => {
    try {
      await desktopApi.clearScrcpyLogs();
      setLogs([]);
    } catch {
      // ignore
    }
  }, []);

  // Filter logs for view
  const filteredLogs = useMemo(() => {
    if (logFilter === "warn") {
      return logs.filter((l) => l.level === "warn" || l.level === "error");
    }
    if (logFilter === "encoder") {
      return logs.filter(
        (l) =>
          l.message.toLowerCase().includes("encoder") ||
          l.message.toLowerCase().includes("decoder") ||
          l.message.toLowerCase().includes("renderer") ||
          l.message.toLowerCase().includes("codec")
      );
    }
    return logs;
  }, [logs, logFilter]);

  // Format thermal status
  const formatThermalStatus = (status?: ThermalStatus | null) => {
    if (!status) return "N/A";
    if (typeof status === "string") {
      return status.toUpperCase();
    }
    return `STATUS ${status.unknown}`;
  };

  const getStatusColor = (probeStatus?: ProbeStatus) => {
    switch (probeStatus) {
      case "ok":
        return "var(--lime)";
      case "timeout":
        return "#f59e0b";
      case "unavailable":
      case "unsupported":
      default:
        return "#64748b";
    }
  };

  // Sparkline generator for Latency & Temperature
  const renderSparkline = (
    data: number[],
    color: string,
    marks: number[] = [],
    height = 36,
    width = 220
  ) => {
    if (data.length < 2) {
      return <div style={{ height, width, opacity: 0.3 }} className="sparkline-placeholder">—</div>;
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
      .map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
        {marks.map((idx, i) => {
          if (idx < 0 || idx >= data.length) return null;
          const x = (idx / (data.length - 1)) * width;
          const val = data[idx] ?? min;
          const y = height - ((val - min) / range) * (height - 8) - 4;
          return <circle key={i} cx={x} cy={y} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
    );
  };

  const latencyHistory = useMemo(() => {
    return samples.map((s) => s.adbCommandLatencyMs ?? 0);
  }, [samples]);

  const stutterMarkIndices = useMemo(() => {
    if (samples.length === 0) return [];
    const markIndices = new Set<number>();

    // 1. Direct sample flags
    samples.forEach((s, idx) => {
      if (s.isStutterMark) {
        markIndices.add(idx);
      }
    });

    // 2. Correlate from StutterBookmarks using elapsedMs
    for (const b of bookmarks) {
      if (b.elapsedMs === undefined || b.elapsedMs === null) continue;
      let closestIdx = -1;
      let minDiff = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const sampleElapsed = samples[i]?.elapsedMs ?? 0;
        const diff = Math.abs(sampleElapsed - b.elapsedMs);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      if (closestIdx !== -1 && minDiff <= 3000) {
        markIndices.add(closestIdx);
      }
    }

    return Array.from(markIndices).sort((a, b) => a - b);
  }, [samples, bookmarks]);

  const currentLatency = session?.transport.adbCommandLatencyMs;
  const baselineLatency = session?.transport.latencyBaselineMs;
  const latencyDelta = currentLatency && baselineLatency ? currentLatency - baselineLatency : 0;

  return (
    <div className="diagnostics-page-container">
      {/* Header Banner */}
      <div className="diagnostics-header">
        <div className="diagnostics-title-group">
          <span className="section-eyebrow">{t("diagnosticsEyebrow")}</span>
          <h2>{t("diagnosticsTitle")}</h2>
          <p>{t("diagnosticsSubtitle")}</p>
          <small className="compositor-hint" style={{ display: "inline-block", marginTop: "4px", color: "var(--text-muted, #94a3b8)", fontSize: "0.78rem" }}>
            💡 {t("compositorBindHint")}
          </small>
        </div>
        <div className="diagnostics-actions-header">
          {/* Prominent Mark Stutter Button */}
          <button
            type="button"
            className={`btn-mark-stutter ${isMarking ? "marking" : ""}`}
            onClick={() => void handleMarkStutter()}
            title={t("markStutterTip")}
          >
            <AlertCircle size={17} />
            <span>{t("markStutterButton")}</span>
            <kbd>Ctrl+Shift+S</kbd>
          </button>

          <button
            type="button"
            className="secondary"
            onClick={() => void exportDiagnosticsJson()}
            title={t("exportDiagnosticsButton")}
          >
            {copiedExport ? <Check size={15} color="var(--lime)" /> : <Download size={15} />}
            <span>{t("exportDiagnosticsButton")}</span>
          </button>
        </div>
      </div>

      {/* Live Telemetry HUD Grid */}
      <div className="diagnostics-hud-grid">
        {/* 1. ADB Command Latency */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">{t("adbLatencyTitle")}</span>
            <span
              className="hud-status-dot"
              style={{ backgroundColor: getStatusColor(session?.transport.adbLatencyStatus) }}
            />
          </div>
          <div className="hud-main-metric">
            <span className="metric-value">
              {session?.transport.adbCommandLatencyMs !== null && session?.transport.adbCommandLatencyMs !== undefined
                ? `${session.transport.adbCommandLatencyMs} ms`
                : "—"}
            </span>
            {baselineLatency && (
              <span className={`metric-delta ${latencyDelta > 20 ? "bad" : "good"}`}>
                {latencyDelta > 0 ? `+${latencyDelta} ms` : `${latencyDelta} ms`}
              </span>
            )}
          </div>
          <div className="hud-sub-metric">
            <span>
              {t("baselineLatency")}: {baselineLatency ? `${baselineLatency} ms` : "—"}
            </span>
            <div className="hud-sparkline">
              {renderSparkline(latencyHistory, "var(--lime)", stutterMarkIndices, 24, 110)}
            </div>
          </div>
          <small className="hud-footnote">{t("adbLatencySubtitle")}</small>
        </div>

        {/* 2. Capture Frame Rate */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">{t("captureFpsTitle")}</span>
            <span className="hud-status-dot" style={{ backgroundColor: mirrorRunning ? "var(--lime)" : "#64748b" }} />
          </div>
          <div className="hud-main-metric">
            <span className="metric-value">
              {session?.scrcpy.captureFps !== null && session?.scrcpy.captureFps !== undefined
                ? `${session.scrcpy.captureFps} FPS`
                : "—"}
            </span>
          </div>
          <div className="hud-sub-metric">
            <span>
              Session: {session?.metadata.sessionId ? `#${session.metadata.sessionId.slice(-6)}` : "Inactive"}
            </span>
            {session?.scrcpy.observedDroppedFrames !== null && session?.scrcpy.observedDroppedFrames !== undefined && (
              <span className="badge-warning">
                {session.scrcpy.observedDroppedFrames} drops
              </span>
            )}
          </div>
          <small className="hud-footnote">{t("captureFpsSubtitle")}</small>
        </div>

        {/* 3. Battery Temperature & Thermal Pressure */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">{t("batteryTempTitle")}</span>
            <span
              className="hud-status-dot"
              style={{ backgroundColor: getStatusColor(session?.device.batteryTempStatus) }}
            />
          </div>
          <div className="hud-main-metric">
            <span className="metric-value">
              {session?.device.batteryTempC !== null && session?.device.batteryTempC !== undefined
                ? `${session.device.batteryTempC.toFixed(1)} °C`
                : "—"}
            </span>
            <span
              className={`thermal-badge ${
                session?.device.thermalStatus === "moderate" || session?.device.thermalStatus === "severe"
                  ? "alert"
                  : "normal"
              }`}
            >
              {formatThermalStatus(session?.device.thermalStatus)}
            </span>
          </div>
          <div className="hud-sub-metric">
            <span>{t("thermalStatusTitle")}</span>
            <span>{session?.device.batteryTempC && session.device.batteryTempC > 42 ? "⚠️ Elevated" : "Normal"}</span>
          </div>
          <small className="hud-footnote">Android dumpsys battery / thermalservice</small>
        </div>

        {/* 4. USB Link Speed & Negotiation */}
        <div className="hud-card">
          <div className="hud-card-header">
            <span className="hud-label">{t("usbLinkSpeedTitle")}</span>
            <span
              className="hud-status-dot"
              style={{ backgroundColor: getStatusColor(session?.transport.usbSpeedStatus) }}
            />
          </div>
          <div className="hud-main-metric">
            <span
              className={`metric-value ${
                session?.transport.usbSpeedMbps && session.transport.usbSpeedMbps < 400 ? "bad" : ""
              }`}
            >
              {session?.transport.usbSpeedMbps ? `${session.transport.usbSpeedMbps} Mbps` : "—"}
            </span>
            {session?.transport.usbPath && <span className="usb-port-pill">{session.transport.usbPath}</span>}
          </div>
          <div className="hud-sub-metric">
            <span>{t("reconnectCountTitle")}</span>
            <span>{session?.transport.reconnectCount ?? 0}</span>
          </div>
          <small className="hud-footnote">{t("usbLinkSubtitle")}</small>
        </div>
      </div>

      {/* Video Pipeline & Active Hardware Metadata */}
      <div className="pipeline-metadata-bar">
        <div className="pipeline-item">
          <Cpu size={15} />
          <span className="item-label">{t("activeEncoderTitle")}:</span>
          <span className="item-val">
            {session?.metadata.pipeline.encoder || "—"}
          </span>
        </div>
        <div className="pipeline-item">
          <Layers size={15} />
          <span className="item-label">{t("activeDecoderTitle")}:</span>
          <span className="item-val">
            {session?.metadata.pipeline.decoder || "—"}
          </span>
        </div>
        <div className="pipeline-item">
          <Monitor size={15} />
          <span className="item-label">{t("displayBackendTitle")}:</span>
          <span className="item-val">
            {session?.metadata.pipeline.displayBackend || (options.forceWayland ? "Wayland (forced)" : "—")}
          </span>
        </div>
        <div className="pipeline-item">
          <Clock size={15} />
          <span className="item-label">Duration:</span>
          <span className="item-val">
            {session?.scrcpy.sessionDurationMs
              ? `${Math.floor(session.scrcpy.sessionDurationMs / 60000)}m ${Math.floor(
                  (session.scrcpy.sessionDurationMs % 60000) / 1000
                )}s`
              : "0m 0s"}
          </span>
        </div>
        <div className="pipeline-item">
          <span className="item-label">Warnings:</span>
          <span className="item-val">{session?.scrcpy.warningCount ?? 0}</span>
        </div>
      </div>

      {/* Stutter Bookmarks List */}
      {bookmarks.length > 0 && (
        <div className="stutter-bookmarks-section">
          <h3>
            <BookmarkCheck size={16} /> {t("bookmarksTitle")} ({bookmarks.length})
          </h3>
          <div className="bookmarks-list">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="bookmark-card">
                <div className="bm-time">
                  <strong>{Math.floor(bm.elapsedMs / 1000)}s into session</strong>
                  <small>{bm.timeUtc.slice(11, 19)} UTC</small>
                </div>
                <div className="bm-metrics">
                  <span>Latency: {bm.latencyAtMarkMs ? `${bm.latencyAtMarkMs} ms` : "—"}</span>
                  <span>Temp: {bm.tempAtMarkC ? `${bm.tempAtMarkC.toFixed(1)} °C` : "—"}</span>
                  <span>USB: {bm.usbSpeedMbps ? `${bm.usbSpeedMbps} Mbps` : "—"}</span>
                </div>
                <div className={`bm-state-badge ${bm.state}`}>
                  {bm.state === "collecting"
                    ? t("bookmarkStateCollecting")
                    : bm.state === "complete"
                    ? t("bookmarkStateComplete")
                    : t("bookmarkStateInterrupted")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1-Click Controlled Baseline & Display Tuning */}
      <div className="diagnostics-tuning-card">
        <div className="tuning-header">
          <div>
            <h4>{t("baselinePresetTitle")}</h4>
            <p>{t("baselinePresetDesc")}</p>
          </div>
          <button type="button" className="secondary" onClick={applyBaselinePreset}>
            <Zap size={15} /> {t("applyBaselineButton")}
          </button>
        </div>
        <div className="tuning-controls-grid">
          {/* Wayland Toggle */}
          <div className="tuning-control-item">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={Boolean(options.forceWayland)}
                onChange={(e) => setOptions((o) => ({ ...o, forceWayland: e.target.checked }))}
              />
              <span>{t("forceWaylandOption")}</span>
            </label>
            <small>{t("forceWaylandDesc")}</small>
          </div>

          {/* Video Jitter Buffer Selector */}
          <div className="tuning-control-item">
            <label>
              <span>{t("videoBufferOption")}: </span>
              <strong>{options.videoBufferMs ?? 0} ms</strong>
            </label>
            <div className="buffer-selector-pills">
              {[0, 10, 20].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  className={`pill-btn ${options.videoBufferMs === ms || (!options.videoBufferMs && ms === 0) ? "active" : ""}`}
                  onClick={() => setOptions((o) => ({ ...o, videoBufferMs: ms }))}
                >
                  {ms} ms {ms === 0 ? "(Zero-delay)" : "(Jitter buffer)"}
                </button>
              ))}
            </div>
            <small>{t("videoBufferJitterDesc")}</small>
          </div>
        </div>
      </div>

      {/* Real-Time scrcpy Log Console */}
      <div className="log-console-container">
        <div className="log-console-header">
          <div className="log-title">
            <Terminal size={15} />
            <span>{t("scrcpyLogsTitle")}</span>
            <span className="log-count">({filteredLogs.length})</span>
          </div>
          <div className="log-filters">
            <button
              type="button"
              className={`filter-btn ${logFilter === "all" ? "active" : ""}`}
              onClick={() => setLogFilter("all")}
            >
              {t("filterAll")}
            </button>
            <button
              type="button"
              className={`filter-btn ${logFilter === "warn" ? "active" : ""}`}
              onClick={() => setLogFilter("warn")}
            >
              {t("filterWarnings")}
            </button>
            <button
              type="button"
              className={`filter-btn ${logFilter === "encoder" ? "active" : ""}`}
              onClick={() => setLogFilter("encoder")}
            >
              {t("filterEncoder")}
            </button>
            <button type="button" className="icon-action-btn" onClick={() => void handleCopyLogs()} title={t("copyLogs")}>
              {copiedLogs ? <Check size={13} color="var(--lime)" /> : <Copy size={13} />}
            </button>
            <button type="button" className="icon-action-btn" onClick={() => void handleClearLogs()} title={t("clearLogs")}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div className="log-console-body" ref={logConsoleRef}>
          {filteredLogs.length === 0 ? (
            <div className="log-empty">{t("logsEmpty")}</div>
          ) : (
            filteredLogs.map((l, idx) => (
              <div key={idx} className={`log-line ${l.level}`}>
                <span className="log-time">+{l.elapsedMs}ms</span>
                <span className={`log-src ${l.source}`}>[{l.source}]</span>
                <span className={`log-lvl ${l.level}`}>[{l.level.toUpperCase()}]</span>
                <span className="log-msg">{l.message}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Root Cause Isolation Guide Accordion */}
      <div className="guide-card">
        <button type="button" className="guide-toggle-btn" onClick={() => setShowGuide((prev) => !prev)}>
          <HelpCircle size={16} />
          <span>{t("guideTitle")}</span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showGuide && (
          <div className="guide-steps-content">
            <div className="guide-step">
              <h5>{t("guideStep1Title")}</h5>
              <p>{t("guideStep1Desc")}</p>
            </div>
            <div className="guide-step">
              <h5>{t("guideStep2Title")}</h5>
              <p>{t("guideStep2Desc")}</p>
            </div>
            <div className="guide-step">
              <h5>{t("guideStep3Title")}</h5>
              <p>{t("guideStep3Desc")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
