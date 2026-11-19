import { useState } from "react";
import {
  Keyboard,
  Video,
  Volume2,
  Palette,
  RotateCcw,
  Sparkles,
  Sliders,
  HelpCircle,
  Globe,
  Radio,
  DownloadCloud,
  RefreshCw,
} from "lucide-react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import packageMetadata from "../../package.json";
import { ConfirmModal } from "./ConfirmModal";
import { PrefRow } from "./ui/PrefRow";
import { GAMING_PROFILE, resetOptions } from "../config/profiles";
import type { MirrorOptions, ToastNotification } from "../types";
import type { Locale, MessageKey } from "../i18n";
import { THEME_PALETTES } from "../config/themes";


interface PreferencesPanelProps {
  options: MirrorOptions;
  setOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
  onNotify?: (toast: Omit<ToastNotification, "id">) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

export function PreferencesPanel({
  options,
  setOptions,
  locale,
  setLocale,
  currentTheme = "lime",
  onThemeChange,
  onNotify,
  t,
}: PreferencesPanelProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "upToDate" | "available" | "downloading" | "installed" | "error"
  >("idle");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  async function handleCheckUpdate() {
    setUpdateStatus("checking");
    try {
      const update = await check();
      if (update?.available) {
        setAvailableUpdate(update);
        setUpdateStatus("available");
        onNotify?.({
          type: "info",
          tag: "UPDATE",
          title: t("updateAvailable", { version: update.version }),
          message: update.body || t("updateAvailable", { version: update.version }),
        });
      } else {
        setUpdateStatus("upToDate");
        onNotify?.({
          type: "success",
          tag: "UPDATE",
          title: t("appTitle"),
          message: t("appUpToDate", { version: packageMetadata.version }),
        });
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      const errStr = String(err);
      if (
        errStr.includes("404") ||
        errStr.includes("ReleaseNotFound") ||
        errStr.includes("TargetsNotFound") ||
        errStr.includes("not found")
      ) {
        setUpdateStatus("upToDate");
        onNotify?.({
          type: "success",
          tag: "UPDATE",
          title: t("appTitle"),
          message: t("appUpToDate", { version: packageMetadata.version }),
        });
      } else {
        setUpdateStatus("error");
        onNotify?.({
          type: "error",
          tag: "UPDATE",
          message: t("updateCheckFailed"),
        });
      }
    }
  }

  async function handleInstallUpdate() {
    if (!availableUpdate) return;
    setUpdateStatus("downloading");
    try {
      let total = 0;
      let downloaded = 0;
      await availableUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? 0;
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          if (total > 0) {
            setDownloadProgress(Math.round((downloaded / total) * 100));
          }
        }
      });
      setUpdateStatus("installed");
      onNotify?.({
        type: "success",
        tag: "UPDATE",
        title: t("updateInstalledRestart"),
        message: t("updateInstalledRestart"),
      });
    } catch (err) {
      setUpdateStatus("error");
      onNotify?.({
        type: "error",
        tag: "ERROR",
        message: String(err),
      });
    }
  }

  function handleReset() {
    setOptions(resetOptions);
    onThemeChange?.("lime");
    setShowResetConfirm(false);
    onNotify?.({
      type: "success",
      tag: "PREFERENCES",
      title: t("preferencesTitle"),
      message: t("preferencesSavedNotice"),
    });
  }

  function applyLowEndGamingProfile() {
    setOptions((current) => ({ ...current, ...GAMING_PROFILE }));
    onNotify?.({
      type: "success",
      tag: "PROFILE",
      title: t("gamingProfileTitle"),
      message: t("gamingProfileApplied"),
    });
  }

  return (
    <section className="preferences-view">
      <div className="view-heading">
        <div>
          <span className="eyebrow">{t("preferencesEyebrow")}</span>
          <h2>{t("preferencesTitle")}</h2>
          <p>{t("preferencesSubtitle")}</p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={() => setShowResetConfirm(true)}
          title={t("resetDefaults")}
        >
          <RotateCcw size={14} />
          {t("resetDefaults")}
        </button>
      </div>

      {/* Group 1: Video & Performance */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Video size={16} />
          <h3>{t("settingsCategoryVideo")}</h3>
        </div>

        {/* Row: Low-end gaming profile */}
        <PrefRow
          icon={<Sparkles size={17} />}
          title={t("gamingProfileTitle")}
          description={t("gamingProfileDesc")}
        >
          <button type="button" className="secondary" onClick={applyLowEndGamingProfile}>
            {t("applyGamingProfile")}
          </button>
        </PrefRow>

        {/* Row: Realtime encoder */}
        <PrefRow
          icon={<Radio size={17} />}
          title={t("lowLatencyEncoderLabel")}
          description={t("lowLatencyEncoderDesc")}
        >
          <select
            value={options.lowLatencyEncoder ? "on" : "off"}
            onChange={(e) =>
              setOptions((val) => ({ ...val, lowLatencyEncoder: e.target.value === "on" }))
            }
          >
            <option value="off">{t("encoderDefault")}</option>
            <option value="on">{t("encoderRealtime")}</option>
          </select>
        </PrefRow>

        {/* Row: Video Codec */}
        <PrefRow
          icon={<Video size={17} />}
          title={t("videoCodecLabel")}
          description={t("videoCodecDesc")}
        >
          <select
            value={options.videoCodec ?? "auto"}
            onChange={(e) =>
              setOptions((val) => ({ ...val, videoCodec: e.target.value }))
            }
          >
            <option value="auto">Auto ({t("recommended")})</option>
            <option value="h264">{t("codecH264")}</option>
            <option value="h265">{t("codecH265")}</option>
            <option value="av1">{t("codecAV1")}</option>
          </select>
        </PrefRow>

        {/* Row: Video Buffer */}
        <PrefRow
          icon={<Sliders size={17} />}
          title={t("videoBufferLabel")}
          description={t("videoBufferDesc")}
        >
          <select
            value={String(options.videoBufferMs ?? 0)}
            onChange={(e) =>
              setOptions((val) => ({ ...val, videoBufferMs: Number(e.target.value) }))
            }
          >
            <option value="0">{t("bufferZero")}</option>
            <option value="50">{t("bufferSmooth")}</option>
            {![0, 50].includes(options.videoBufferMs ?? 0) && (
              <option value={String(options.videoBufferMs)}>{options.videoBufferMs} ms</option>
            )}
          </select>
        </PrefRow>

        {/* Row: Host decoder */}
        <PrefRow
          icon={<Sliders size={17} />}
          title={t("hwdecLabel")}
          description={t("hwdecDesc")}
        >
          <select
            value={options.hwdec ?? "auto"}
            onChange={(e) =>
              setOptions((val) => ({ ...val, hwdec: e.target.value as "auto" | "disabled" }))
            }
          >
            <option value="auto">{t("hwdecAuto")}</option>
            <option value="disabled">{t("hwdecSoftware")}</option>
          </select>
        </PrefRow>
      </div>

      {/* Group 2: Audio Engine */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Volume2 size={16} />
          <h3>{t("settingsCategoryAudio")}</h3>
        </div>

        {/* Row: Audio Codec */}
        <PrefRow
          icon={<Radio size={17} />}
          title={t("audioCodecLabel")}
          description={t("audioCodecDesc")}
        >
          <select
            value={options.audioCodec ?? "auto"}
            onChange={(e) =>
              setOptions((val) => ({ ...val, audioCodec: e.target.value }))
            }
          >
            <option value="auto">{t("audioCodecAuto")}</option>
            <option value="raw">{t("audioCodecRaw")}</option>
            <option value="flac">{t("audioCodecFlac")}</option>
          </select>
        </PrefRow>

        {/* Row: Audio Buffer */}
        <PrefRow
          icon={<Volume2 size={17} />}
          title={t("audioBufferLabel")}
          description={t("audioBufferDesc")}
        >
          <select
            value={options.audioBufferMs ?? 100}
            onChange={(e) =>
              setOptions((val) => ({ ...val, audioBufferMs: Number(e.target.value) }))
            }
          >
            <option value={50}>{t("audioBufferLow")}</option>
            <option value={100}>{t("audioBufferDefault")}</option>
            <option value={200}>{t("audioBufferHigh")}</option>
          </select>
        </PrefRow>
      </div>

      {/* Group 3: Input & Modifier */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Keyboard size={16} />
          <h3>{t("settingsCategoryInput")}</h3>
        </div>

        {/* Row: Modifier Key */}
        <PrefRow
          icon={<Keyboard size={17} />}
          title={t("shortcutModLabel")}
          description={t("shortcutModDescription")}
        >
          <select
            value={options.shortcutMod ?? "lalt,lsuper"}
            onChange={(e) =>
              setOptions((value) => ({ ...value, shortcutMod: e.target.value }))
            }
          >
            <option value="lalt,lsuper">{t("modAltOrSuper")}</option>
            <option value="lalt">{t("modAlt")}</option>
            <option value="lsuper">{t("modSuper")}</option>
            <option value="lctrl">{t("modCtrl")}</option>
          </select>
        </PrefRow>

        {/* Row: WASD Diagnostics */}
        <PrefRow
          icon={<HelpCircle size={17} />}
          title={t("keyRepeatTipTitle")}
          description={t("keyRepeatTipDesc")}
        >
          <code className="tip-code">xset r off</code>
        </PrefRow>
      </div>

      {/* Group 4: Appearance & Language */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Palette size={16} />
          <h3>{t("settingsCategoryAppearance")}</h3>
        </div>

        {/* Row: Theme Palette */}
        <PrefRow
          icon={<Palette size={17} />}
          title={t("themeAccentLabel")}
          description={t("themeAccentDesc")}
        >
          <div className="theme-palette-picker">
            {THEME_PALETTES.map((palette) => {
              const isSelected = currentTheme === palette.id;
              return (
                <button
                  key={palette.id}
                  type="button"
                  className={`theme-chip ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onThemeChange?.(palette.id);
                    onNotify?.({
                      type: "info",
                      tag: "THEME",
                      title: t("themeAccentLabel"),
                      message: t(palette.nameKey),
                    });
                  }}
                  title={t(palette.nameKey)}
                >
                  <span
                    className="color-dot"
                    style={{ background: palette.hex }}
                  />
                  <span className="chip-name">{t(palette.nameKey)}</span>
                  {isSelected && <Sparkles size={12} className="chip-icon" />}
                </button>
              );
            })}
          </div>
        </PrefRow>

        {/* Row: Interface Language */}
        <PrefRow
          icon={<Globe size={17} />}
          title={t("languageLabel")}
          description={t("languageDesc")}
        >
          <select
            value={locale}
            onChange={(e) => {
              const next = e.target.value as Locale;
              setLocale(next);
              onNotify?.({
                type: "info",
                tag: "LANG",
                title: t("languageLabel"),
                message: next === "es" ? "Español" : next === "en" ? "English" : "简体中文",
              });
            }}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </PrefRow>
      </div>

      {/* Group 5: Updates & Maintenance */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <DownloadCloud size={16} />
          <h3>{t("updatesCategory")}</h3>
        </div>

        {/* Row: Software Updates */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <DownloadCloud size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("updatesCategory")}</h4>
                <span className="preset-badge idle">v{packageMetadata.version}</span>
              </div>
              <p>
                {updateStatus === "available" && availableUpdate
                  ? t("updateAvailable", { version: availableUpdate.version })
                  : updateStatus === "upToDate"
                  ? t("appUpToDate", { version: packageMetadata.version })
                  : updateStatus === "checking"
                  ? t("checkingForUpdates")
                  : updateStatus === "downloading"
                  ? `${t("downloadingUpdate")} (${downloadProgress}%)`
                  : t("checkForUpdatesDesc")}
              </p>
            </div>
          </div>
          <div className="pref-row-control">
            {updateStatus === "available" ? (
              <button
                type="button"
                className="primary"
                style={{ minHeight: "34px", padding: "0 13px", fontSize: "11px" }}
                onClick={() => void handleInstallUpdate()}
              >
                <DownloadCloud size={14} />
                {t("downloadAndInstall")}
              </button>
            ) : (
              <button
                type="button"
                className="secondary"
                style={{ minHeight: "34px", padding: "0 13px", fontSize: "11px" }}
                disabled={updateStatus === "checking" || updateStatus === "downloading"}
                onClick={() => void handleCheckUpdate()}
              >
                <RefreshCw size={13} className={updateStatus === "checking" ? "spin" : ""} />
                {updateStatus === "checking" ? t("checkingForUpdates") : t("checkForUpdates")}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        title={t("resetPreferencesConfirm")}
        description={t("resetPreferencesDesc")}
        confirmText={t("resetDefaults")}
        cancelText={t("cancel")}
        isDanger={false}
        badge="AETHER"
        badgeType="info"
        onConfirm={handleReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </section>
  );
}
