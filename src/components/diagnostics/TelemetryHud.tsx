import type { ProbeStatus, SessionDiagnostics, ThermalStatus } from "../../types";
import { Sparkline } from "./Sparkline";
import type { Translator } from "../../i18n";

interface TelemetryHudProps {
  session: SessionDiagnostics | null;
  mirrorRunning: boolean;
  latencyHistory: number[];
  stutterMarkIndices: number[];
  t: Translator;
}

function formatThermalStatus(status?: ThermalStatus | null) {
  if (!status) return "N/A";
  if (typeof status === "string") return status.toUpperCase();
  return `STATUS ${status.unknown}`;
}

function getStatusColor(probeStatus?: ProbeStatus) {
  switch (probeStatus) {
    case "ok":
      return "var(--lime)";
    case "timeout":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

/** Four live cards: adb latency, capture FPS, battery temperature, USB link. */
export function TelemetryHud({ session, mirrorRunning, latencyHistory, stutterMarkIndices, t }: TelemetryHudProps) {
  const baselineLatency = session?.transport.latencyBaselineMs;
  const currentLatency = session?.transport.adbCommandLatencyMs;
  const latencyDelta = currentLatency && baselineLatency ? currentLatency - baselineLatency : 0;

  return (
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
              <Sparkline data={latencyHistory} color="var(--lime)" marks={stutterMarkIndices} height={24} width={110} />
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
  );
}
