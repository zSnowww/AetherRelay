import { CheckCircle2, Cpu, MemoryStick } from "lucide-react";
import type { SystemStats } from "../../types";
import type { Translator } from "../../i18n";
import { formatMemory } from "./format";

/** Host computer RAM usage. */
export function PcMemoryCard({ pcStats, t }: { pcStats: SystemStats | null; t: Translator }) {
  const pcMemoryPercent = pcStats ? Math.round((pcStats.usedMemoryBytes / pcStats.totalMemoryBytes) * 100) : 0;
  return (
        <div className="memory-card panel">
          <div className="memory-card-header">
            <div className="memory-card-title">
              <div className="memory-icon">
                <Cpu size={20} />
              </div>
              <div>
                <h3>{t("pcMemoryTitle")}</h3>
                <span>{t("performanceSubtitle")}</span>
              </div>
            </div>
            <span className="memory-device-badge">
              <MemoryStick size={12} />
              Host PC
            </span>
          </div>

          <div className="memory-stats-row">
            <div>
              <span>{t("memoryInUse")}</span>
              <strong>
                {pcStats
                  ? `${formatMemory(pcStats.usedMemoryBytes)} / ${formatMemory(pcStats.totalMemoryBytes)}`
                  : t("calculating")}
              </strong>
            </div>
            <em>{pcMemoryPercent}%</em>
          </div>

          <div className="memory-meter" aria-label={`${pcMemoryPercent}%`}>
            <i style={{ width: `${pcMemoryPercent}%` }} />
          </div>

          <div className="memory-stats-row">
            <span>
              {pcStats
                ? t("freeMemory", {
                    free: formatMemory(pcStats.totalMemoryBytes - pcStats.usedMemoryBytes),
                  })
                : "—"}
            </span>
          </div>

          <div className="memory-status-box optimal">
            <CheckCircle2 size={15} />
            <span>
              {t("processesVisible", { count: pcStats?.processes.length ?? 0 })}
            </span>
          </div>
        </div>
  );
}
