import { MemoryStick, X } from "lucide-react";
import type { SystemStats } from "../../types";
import type { Translator } from "../../i18n";
import { formatMemory } from "./format";

interface PcProcessListProps {
  pcStats: SystemStats | null;
  onClose: (target: { pid: number; name: string }) => void;
  t: Translator;
}

/** Host processes owned by the current user, largest first. */
export function PcProcessList({ pcStats, onClose, t }: PcProcessListProps) {
  return (
      <div className="process-panel panel">
        <div className="section-title">
          <div>
            <MemoryStick size={18} />
            <h3>{t("processesByMemory")}</h3>
          </div>
          <span>{t("processesVisible", { count: pcStats?.processes.length ?? 0 })}</span>
        </div>
        <p className="process-note">{t("processNote")}</p>
        <div className="process-list">
          {pcStats?.processes.map((process) => (
            <div className="process-row" key={process.pid}>
              <div className="process-name">
                <strong>{process.name}</strong>
                <small title={process.command}>{process.command}</small>
              </div>
              <span>{formatMemory(process.memoryBytes)}</span>
              <small>PID {process.pid}</small>
              <button
                className="process-close"
                onClick={() => onClose({ pid: process.pid, name: process.name })}
                title={t("closeProcessTitle", { name: process.name })}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>
  );
}
