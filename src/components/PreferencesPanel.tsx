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
import type { MirrorOptions, ToastNotification } from "../types";
import type { Locale, MessageKey } from "../i18n";

export const THEME_PALETTES = [
  {
    id: "lime",
    nameKey: "themeLime" as MessageKey,
    hex: "#c5f015",
    soft: "rgba(197, 240, 21, .14)",
    bg: "#090f0a",
    surface: "#111812",
    border: "rgba(197, 240, 21, .12)",
    borderStrong: "rgba(197, 240, 21, .26)",
    radial1: "rgba(197, 240, 21, .13)",
    radial2: "rgba(197, 240, 21, .05)",
  },
  {
    id: "cyan",
    nameKey: "themeCyan" as MessageKey,
    hex: "#38bdf8",
    soft: "rgba(56, 189, 248, .14)",
    bg: "#071018",
    surface: "#0d1b26",
    border: "rgba(56, 189, 248, .13)",
    borderStrong: "rgba(56, 189, 248, .28)",
    radial1: "rgba(56, 189, 248, .15)",
    radial2: "rgba(56, 189, 248, .06)",
  },
  {
    id: "violet",
    nameKey: "themeViolet" as MessageKey,
    hex: "#a855f7",
    soft: "rgba(168, 85, 247, .14)",
    bg: "#0f081a",
    surface: "#180f28",
    border: "rgba(168, 85, 247, .13)",
    borderStrong: "rgba(168, 85, 247, .28)",
    radial1: "rgba(168, 85, 247, .16)",
    radial2: "rgba(168, 85, 247, .06)",
  },
  {
    id: "pink",
    nameKey: "themePink" as MessageKey,
    hex: "#f472b6",
    soft: "rgba(244, 114, 182, .14)",
    bg: "#150811",
    surface: "#210f1c",
    border: "rgba(244, 114, 182, .13)",
    borderStrong: "rgba(244, 114, 182, .28)",
    radial1: "rgba(244, 114, 182, .16)",
    radial2: "rgba(244, 114, 182, .06)",
  },
  {
    id: "amber",
    nameKey: "themeAmber" as MessageKey,
    hex: "#f59e0b",
    soft: "rgba(245, 158, 11, .14)",
    bg: "#140c04",
    surface: "#1e1308",
    border: "rgba(245, 158, 11, .13)",
    borderStrong: "rgba(245, 158, 11, .28)",
    radial1: "rgba(245, 158, 11, .15)",
    radial2: "rgba(245, 158, 11, .06)",
  },
];

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
    } catch {
      setUpdateStatus("error");
      onNotify?.({
        type: "error",
        tag: "UPDATE",
        message: t("updateCheckFailed"),
      });
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
    setOptions((current) => ({
      ...current,
      maxSize: 1920,
      videoBitRateMbps: 16,
      maxFps: 60,
      turnScreenOff: false,
      stayAwake: true,
      fullscreen: false,
      audio: true,
      alwaysOnTop: false,
      launchPandaMousePro: true,
      virtualDisplay: false,
      shortcutMod: "lalt,lsuper",
      videoCodec: "auto",
      audioCodec: "auto",
      audioBufferMs: 100,
    }));
    onThemeChange?.("lime");
    setShowResetConfirm(false);
    onNotify?.({
      type: "success",
      tag: "PREFERENCES",
      title: t("preferencesTitle"),
      message: t("preferencesSavedNotice"),
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

        {/* Row: Video Codec */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Video size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("videoCodecLabel")}</h4>
              </div>
              <p>{t("videoCodecDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>

        {/* Row: Video Buffer */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Sliders size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("videoBufferLabel")}</h4>
              </div>
              <p>{t("videoBufferDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
            <select
              value={options.virtualDisplay ? "smooth" : "zero"}
              onChange={(e) =>
                setOptions((val) => ({ ...val, virtualDisplay: e.target.value === "smooth" }))
              }
            >
              <option value="zero">{t("bufferZero")}</option>
              <option value="smooth">{t("bufferSmooth")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Group 2: Audio Engine */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Volume2 size={16} />
          <h3>{t("settingsCategoryAudio")}</h3>
        </div>

        {/* Row: Audio Codec */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Radio size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("audioCodecLabel")}</h4>
              </div>
              <p>{t("audioCodecDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>

        {/* Row: Audio Buffer */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Volume2 size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("audioBufferLabel")}</h4>
              </div>
              <p>{t("audioBufferDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>
      </div>

      {/* Group 3: Input & Modifier */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Keyboard size={16} />
          <h3>{t("settingsCategoryInput")}</h3>
        </div>

        {/* Row: Modifier Key */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Keyboard size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("shortcutModLabel")}</h4>
              </div>
              <p>{t("shortcutModDescription")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>

        {/* Row: WASD Diagnostics */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <HelpCircle size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("keyRepeatTipTitle")}</h4>
              </div>
              <p>{t("keyRepeatTipDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
            <code className="tip-code">xset r off</code>
          </div>
        </div>
      </div>

      {/* Group 4: Appearance & Language */}
      <div className="pref-group panel">
        <div className="pref-group-header">
          <Palette size={16} />
          <h3>{t("settingsCategoryAppearance")}</h3>
        </div>

        {/* Row: Theme Palette */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Palette size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("themeAccentLabel")}</h4>
              </div>
              <p>{t("themeAccentDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>

        {/* Row: Interface Language */}
        <div className="pref-row">
          <div className="pref-row-main">
            <div className="pref-icon">
              <Globe size={17} />
            </div>
            <div className="pref-texts">
              <div className="pref-title-line">
                <h4>{t("languageLabel")}</h4>
              </div>
              <p>{t("languageDesc")}</p>
            </div>
          </div>
          <div className="pref-row-control">
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
          </div>
        </div>
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
                  : "Comprueba si hay nuevas versiones de Aether Relay disponibles en GitHub Releases."}
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
