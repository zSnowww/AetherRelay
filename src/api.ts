import { invoke } from "@tauri-apps/api/core";
import type { ActivationResult, Device, DeviceMemoryStats, EnvironmentStatus, MirrorOptions, MirrorState, SystemStats } from "./types";

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
  boostPhoneMemory: (serial: string) => invokeDesktop<DeviceMemoryStats>("boost_phone_memory", { serial }),
  killPhoneApps: (serial: string, packages: string[], force = true) => invokeDesktop<DeviceMemoryStats>("kill_phone_apps", { serial, packages, force }),
  listPresetApps: (serial: string) => invokeDesktop<import("./types").PresetAppInfo[]>("list_preset_apps", { serial }),
  activateApps: (serial: string, targetApp?: string) => invokeDesktop<ActivationResult>("activate_apps", { serial, targetApp: targetApp || null }),
  deactivateApps: (serial: string) => invokeDesktop<string>("deactivate_apps", { serial }),
  checkKeymapperStatus: (serial: string) => invokeDesktop<boolean>("check_keymapper_status", { serial }),
  start: (options: MirrorOptions) => invokeDesktop<MirrorState>("start_mirror", { options }),
  stop: () => invokeDesktop<MirrorState>("stop_mirror"),
  state: () => invokeDesktop<MirrorState>("mirror_state"),
  fps: () => invokeDesktop<number | null>("mirror_fps"),
  systemStats: () => invokeDesktop<SystemStats>("system_stats"),
  terminateProcess: (pid: number) => invokeDesktop<void>("terminate_process", { pid })
};
