import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Terminal, Trash2 } from "lucide-react";
import type { ScrcpyLogEntry } from "../../types";
import type { Translator } from "../../i18n";

type LogFilter = "all" | "warn" | "encoder";
const PIPELINE_WORDS = ["encoder", "decoder", "renderer", "codec"];

interface LogConsoleProps {
  logs: ScrcpyLogEntry[];
  onClear: () => Promise<void>;
  t: Translator;
}

/** Live scrcpy stdout/stderr with filters, copy and clear. */
export function LogConsole({ logs, onClear, t }: LogConsoleProps) {
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [copiedLogs, setCopiedLogs] = useState(false);
  const logConsoleRef = useRef<HTMLDivElement>(null);

  // Keep the newest line in view.
  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (logFilter === "warn") return logs.filter((l) => l.level === "warn" || l.level === "error");
    if (logFilter === "encoder") {
      return logs.filter((l) => {
        const msg = l.message.toLowerCase();
        return PIPELINE_WORDS.some((word) => msg.includes(word));
      });
    }
    return logs;
  }, [logs, logFilter]);

  const handleCopyLogs = useCallback(async () => {
    try {
      const text = logs
        .map((l) => `[${l.elapsedMs}ms][${l.source.toUpperCase()}][${l.level.toUpperCase()}] ${l.message}`)
        .join("\n");
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch { /* clipboard unavailable */ }
  }, [logs]);

  return (
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
            <button type="button" className="icon-action-btn" onClick={() => void onClear()} title={t("clearLogs")}>
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
  );
}
