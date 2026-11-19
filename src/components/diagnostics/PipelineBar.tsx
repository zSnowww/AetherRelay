import { Clock, Cpu, Layers, Monitor } from "lucide-react";
import type { SessionDiagnostics } from "../../types";
import type { Translator } from "../../i18n";

interface PipelineBarProps {
  session: SessionDiagnostics | null;
  forceWayland?: boolean;
  t: Translator;
}

/** Encoder, decoder, display backend, duration and warning count. */
export function PipelineBar({ session, forceWayland, t }: PipelineBarProps) {
  return (
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
            {session?.metadata.pipeline.displayBackend || (forceWayland ? "Wayland (forced)" : "—")}
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
  );
}
