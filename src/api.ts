import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ActivationResult,
  Device,
  DeviceMemoryStats,
  EnvironmentStatus,
  GameBoostResult,
  MirrorOptions,
  MirrorState,
  PhoneProcessInfo,
  ScrcpyLogEntry,
  SessionDiagnostics,
  SessionSample,
  StutterBookmark,
  SystemStats,
} from "./types";

function invokeDesktop<T>(command: string, args?: Record<string, unknown>) {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return Promise.reject(new Error("Esta función está disponible al abrir Aether Relay como aplicación de escritorio."));
  }
  return invoke<T>(command, args);
}

export const desktopApi = {
  environment: () => invokeDesktop<EnvironmentStatus>("check_environment"),
  devices: () => invokeDesktop<Device[]>("list_devices"),
  deviceMemory: (serial: string) => invokeDesktop<DeviceMemoryStats>("device_memory", { serial }),
  boostPhoneMemory: (serial: string, packages: string[]) => invokeDesktop<GameBoostResult>("boost_phone_memory", { serial, packages }),
  killPhoneApps: (serial: string, packages: string[], force = true) => invokeDesktop<DeviceMemoryStats>("kill_phone_apps", { serial, packages, force }),
  listPresetApps: (serial: string) => invokeDesktop<import("./types").PresetAppInfo[]>("list_preset_apps", { serial }),
  listPhoneProcesses: (serial: string) => invokeDesktop<PhoneProcessInfo[]>("list_phone_processes", { serial }),
  activateApps: (serial: string, targetApp?: string) => invokeDesktop<ActivationResult>("activate_apps", { serial, targetApp: targetApp || null }),
  deactivateApps: (serial: string) => invokeDesktop<string>("deactivate_apps", { serial }),
  checkKeymapperStatus: (serial: string) => invokeDesktop<boolean>("check_keymapper_status", { serial }),
  start: (options: MirrorOptions) => invokeDesktop<MirrorState>("start_mirror", { options }),
  stop: () => invokeDesktop<MirrorState>("stop_mirror"),
  state: () => invokeDesktop<MirrorState>("mirror_state"),
  fps: () => invokeDesktop<number | null>("mirror_fps"),
  systemStats: () => invokeDesktop<SystemStats>("system_stats"),
  terminateProcess: (pid: number) => invokeDesktop<void>("terminate_process", { pid }),

  // ── Session Diagnostics & Stutter Toolkit ─────────────────────────────────
  sessionDiagnostics: () => invokeDesktop<SessionDiagnostics | null>("get_session_diagnostics"),
  sessionSamples: (limit?: number) => invokeDesktop<SessionSample[]>("get_session_samples", { limit }),
  markStutter: () => invokeDesktop<StutterBookmark | null>("mark_stutter"),
  stutterBookmarks: () => invokeDesktop<StutterBookmark[]>("get_stutter_bookmarks"),
  exportDiagnostics: (logs: ScrcpyLogEntry[]) => invokeDesktop<string>("export_diagnostics_json", { logs }),
  scrcpyLogs: (limit?: number) => invokeDesktop<ScrcpyLogEntry[]>("get_scrcpy_logs", { limit }),
  clearScrcpyLogs: () => invokeDesktop<void>("clear_scrcpy_logs"),
};

export function onStutterMarked(callback: () => void): Promise<UnlistenFn> {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    return Promise.resolve(() => {});
  }
  return listen("stutter-marked", () => {
    callback();
  });
}
