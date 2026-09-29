export type ToolInfo = { available: boolean; path: string | null; version: string | null };
export type EnvironmentStatus = { adb: ToolInfo; scrcpy: ToolInfo };
export type Device = { serial: string; state: string; model: string | null; product: string | null; transportId: string | null };
export type MirrorOptions = {
  serial: string;
  maxSize: number;
  videoBitRateMbps: number;
  maxFps: number;
  turnScreenOff: boolean;
  stayAwake: boolean;
  fullscreen: boolean;
  audio: boolean;
  alwaysOnTop: boolean;
  launchPandaMousePro: boolean;
  launchAppPackage?: string;
  targetApp?: string;
  shortcutMod?: string;
  virtualDisplay: boolean;
  videoCodec?: string;
  audioCodec?: string;
  audioBufferMs?: number;
};
export type ToastNotification = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  tag?: string;
  duration?: number;
};
export type SystemProcess = { pid: number; name: string; command: string; memoryBytes: number; state: string };
export type SystemStats = { totalMemoryBytes: number; usedMemoryBytes: number; processes: SystemProcess[] };
export type MirrorState = { running: boolean; pid: number | null; serial: string | null };
export type ActivationLog = { timestamp: string; message: string; isError: boolean };
export type ActivationResult = {
  success: boolean;
  appName: string;
  packageName: string;
  scriptUsed: string;
  logs: ActivationLog[];
};
export type DeviceMemoryStats = {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percentage: number;
};
export type PresetAppInfo = {
  id: string;
  name: string;
  package: string;
  installed: boolean;
  running: boolean;
};

