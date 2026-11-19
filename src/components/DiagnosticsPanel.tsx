import { useCallback, useState } from "react";
import { AlertCircle, Check, Download } from "lucide-react";
import { desktopApi } from "../api";
import { BASELINE_PROFILE } from "../config/profiles";
import type { MirrorOptions, ToastNotification } from "../types";
import { describeBackendError } from "../i18n";
import { BookmarksList } from "./diagnostics/BookmarksList";
import { LogConsole } from "./diagnostics/LogConsole";
import { PipelineBar } from "./diagnostics/PipelineBar";
import { TelemetryHud } from "./diagnostics/TelemetryHud";
import { TroubleshootingGuide } from "./diagnostics/TroubleshootingGuide";
import { TuningCard } from "./diagnostics/TuningCard";
import type { Translator } from "../i18n";
import { useDiagnosticsData } from "./diagnostics/useDiagnosticsData";

interface DiagnosticsPanelProps {
  t: Translator;
  selectedSerial?: string;
  options: MirrorOptions;
  setOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  mirrorRunning: boolean;
  onNotify?: (toast: Omit<ToastNotification, "id">) => void;
}

export function DiagnosticsPanel({ t, options, setOptions, mirrorRunning, onNotify }: DiagnosticsPanelProps) {
  const { session, bookmarks, logs, refresh, clearLogs, latencyHistory, stutterMarkIndices } = useDiagnosticsData();
  const [isMarking, setIsMarking] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  const handleMarkStutter = useCallback(async () => {
    setIsMarking(true);
    try {
      const mark = await desktopApi.markStutter();
      if (mark) {
        onNotify?.({ type: "warning", tag: "STUTTER", title: t("markStutterButton"), message: t("stutterMarkedNotice") });
        await refresh();
      }
    } catch (e) {
      onNotify?.({ type: "error", tag: "ERROR", message: describeBackendError(t, e) });
    } finally {
      setTimeout(() => setIsMarking(false), 600);
    }
  }, [refresh, onNotify, t]);

  const applyBaselinePreset = useCallback(() => {
    setOptions((prev) => ({ ...prev, ...BASELINE_PROFILE }));
    onNotify?.({ type: "success", tag: "BASELINE", title: t("baselinePresetTitle"), message: t("baselineApplied") });
  }, [onNotify, setOptions, t]);

  // Redacted JSON report: copied to the clipboard (best-effort) and downloaded.
  const exportDiagnosticsJson = useCallback(async () => {
    try {
      const json = await desktopApi.exportDiagnostics(logs);
      try {
        await navigator.clipboard.writeText(json);
        setCopiedExport(true);
        setTimeout(() => setCopiedExport(false), 2000);
      } catch {
        // Clipboard can fail in unfocused webviews; the download still happens.
      }
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `aether-diagnostics-${session?.metadata.sessionId || "report"}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onNotify?.({ type: "success", tag: "EXPORT", title: t("exportDiagnosticsButton"), message: t("exportSuccess") });
    } catch (e) {
      onNotify?.({ type: "error", tag: "ERROR", message: describeBackendError(t, e) });
    }
  }, [logs, onNotify, session?.metadata.sessionId, t]);

  return (
    <div className="diagnostics-page-container">
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

      <TelemetryHud
        session={session}
        mirrorRunning={mirrorRunning}
        latencyHistory={latencyHistory}
        stutterMarkIndices={stutterMarkIndices}
        t={t}
      />
      <PipelineBar session={session} forceWayland={options.forceWayland} t={t} />
      <BookmarksList bookmarks={bookmarks} t={t} />
      <TuningCard options={options} setOptions={setOptions} onApplyBaseline={applyBaselinePreset} t={t} />
      <LogConsole logs={logs} onClear={clearLogs} t={t} />
      <TroubleshootingGuide t={t} />
    </div>
  );
}
