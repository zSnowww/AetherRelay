import { Zap } from "lucide-react";
import type { MirrorOptions } from "../../types";
import type { Translator } from "../../i18n";

interface TuningCardProps {
  options: MirrorOptions;
  setOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  onApplyBaseline: () => void;
  t: Translator;
}

/** Controlled baseline preset, forced Wayland, and jitter buffer for A/B testing. */
export function TuningCard({ options, setOptions, onApplyBaseline, t }: TuningCardProps) {
  return (
      <div className="diagnostics-tuning-card">
        <div className="tuning-header">
          <div>
            <h4>{t("baselinePresetTitle")}</h4>
            <p>{t("baselinePresetDesc")}</p>
          </div>
          <button type="button" className="secondary" onClick={onApplyBaseline}>
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
                  onClick={() => setOptions((o) => ({ ...o, videoBufferMs: ms, verboseLogs: true }))}
                >
                  {ms} ms {ms === 0 ? "(Zero-delay)" : "(Jitter buffer)"}
                </button>
              ))}
            </div>
            <small>{t("videoBufferJitterDesc")}</small>
          </div>
        </div>
      </div>
  );
}
