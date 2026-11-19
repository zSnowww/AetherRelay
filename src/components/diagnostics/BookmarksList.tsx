import { BookmarkCheck } from "lucide-react";
import type { StutterBookmark } from "../../types";
import type { Translator } from "../../i18n";

export function BookmarksList({ bookmarks, t }: { bookmarks: StutterBookmark[]; t: Translator }) {
  if (bookmarks.length === 0) return null;
  return (
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
  );
}
