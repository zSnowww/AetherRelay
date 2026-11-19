import type { MirrorOptions } from "../types";

/** Single source of truth for mirror settings on first launch and after "Reset". */
export const DEFAULT_OPTIONS: MirrorOptions = {
  serial: "",
  maxSize: 1920,
  videoBitRateMbps: 12,
  maxFps: 60,
  turnScreenOff: false,
  stayAwake: true,
  fullscreen: false,
  audio: true,
  alwaysOnTop: false,
  targetApp: "auto",
  launchPandaMousePro: true,
  launchAppPackage: "",
  shortcutMod: "lalt,lsuper",
  virtualDisplay: false,
  videoCodec: "auto",
  audioCodec: "auto",
  audioBufferMs: 100,
  videoBufferMs: 0,
  lowLatencyEncoder: false,
  hwdec: "auto",
  verboseLogs: false,
};

/** Fields that identify the user's device and app; a reset keeps them. */
const DEVICE_FIELDS = ["serial", "targetApp", "launchAppPackage"] as const;

export function resetOptions(current: MirrorOptions): MirrorOptions {
  const kept = Object.fromEntries(DEVICE_FIELDS.map((key) => [key, current[key]]));
  return { ...DEFAULT_OPTIONS, ...kept };
}

/**
 * Tuned on a Snapdragon 4 Gen 2 / 4 GB phone: near-native 720p capture,
 * hardware H.264 at a low bitrate, realtime encoder, screen off to limit heat.
 */
export const GAMING_PROFILE: Partial<MirrorOptions> = {
  maxSize: 1600,
  videoBitRateMbps: 8,
  maxFps: 60,
  videoCodec: "h264",
  lowLatencyEncoder: true,
  videoBufferMs: 0,
  hwdec: "auto",
  virtualDisplay: false,
  turnScreenOff: true,
  stayAwake: true,
  audio: true,
  audioBufferMs: 60,
};

/** Controlled baseline for diagnostics: removes audio and buffering as variables. */
export const BASELINE_PROFILE: Partial<MirrorOptions> = {
  maxSize: 1920,
  maxFps: 60,
  videoCodec: "h264",
  videoBitRateMbps: 8,
  audio: false,
  videoBufferMs: 0,
  verboseLogs: true,
  turnScreenOff: true,
  stayAwake: true,
};
