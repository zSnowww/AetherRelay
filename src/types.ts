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
  videoBufferMs?: number;
  forceWayland?: boolean;
};

export type ProbeStatus = "ok" | "timeout" | "unavailable" | "unsupported";
export type BookmarkState = "collecting" | "complete" | "interrupted";
export type ThermalStatus =
  | "none"
  | "light"
  | "moderate"
  | "severe"
  | "critical"
  | "emergency"
  | "shutdown"
  | { unknown: number };

export type VideoPipelineMetadata = {
  encoder?: string | null;
  decoder?: string | null;
  hardwareDecoding?: boolean | null;
  renderer?: string | null;
  displayBackend?: string | null;
};

export type SessionMetadata = {
  sessionId: string;
  startedAtMs: number;
  startedAtUtc: string;
  endedAtMs?: number | null;
  exitReason?: string | null;
  deviceSerial: string;
  scrcpyVersion?: string | null;
  pipeline: VideoPipelineMetadata;
};

export type DeviceDiagnostics = {
  batteryTempC?: number | null;
  batteryTempStatus: ProbeStatus;
  thermalStatus?: ThermalStatus | null;
  thermalStatusStatus: ProbeStatus;
};

export type TransportDiagnostics = {
  adbCommandLatencyMs?: number | null;
  adbLatencyStatus: ProbeStatus;
  latencyBaselineMs?: number | null;
  usbSpeedMbps?: number | null;
  usbSpeedStatus: ProbeStatus;
  usbPath?: string | null;
  transportId?: string | null;
  reconnectCount: number;
};

export type ScrcpyDiagnostics = {
  captureFps?: number | null;
  warningCount: number;
  observedDroppedFrames?: number | null;
  sessionDurationMs: number;
};

export type SessionDiagnostics = {
  metadata: SessionMetadata;
  device: DeviceDiagnostics;
  transport: TransportDiagnostics;
  scrcpy: ScrcpyDiagnostics;
};

export type SessionSample = {
  elapsedMs: number;
  adbCommandLatencyMs?: number | null;
  adbLatencyStatus: ProbeStatus;
  captureFps?: number | null;
  batteryTempC?: number | null;
  batteryTempStatus: ProbeStatus;
  thermalStatus?: ThermalStatus | null;
  thermalStatusStatus: ProbeStatus;
  usbSpeedMbps?: number | null;
  usbSpeedStatus: ProbeStatus;
  warningsSinceLastSample: number;
  isStutterMark: boolean;
};

export type StutterBookmark = {
  id: string;
  elapsedMs: number;
  timeUtc: string;
  state: BookmarkState;
  latencyAtMarkMs?: number | null;
  baselineLatencyMs?: number | null;
  fpsAtMark?: number | null;
  tempAtMarkC?: number | null;
  thermalStatus?: ThermalStatus | null;
  usbSpeedMbps?: number | null;
  windowSamples: SessionSample[];
  recentWarnings: string[];
};

export type ScrcpyLogSource = "client" | "server";
export type ScrcpyLogLevel = "info" | "warn" | "error" | "debug";

export type ScrcpyLogEntry = {
  elapsedMs: number;
  source: ScrcpyLogSource;
  level: ScrcpyLogLevel;
  message: string;
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
export type GameBoostResult = {
  before: DeviceMemoryStats;
  after: DeviceMemoryStats;
  stoppedPackages: string[];
  protectedForegroundPackage: string | null;
};
export type PhoneProcessInfo = {
  pid?: number | null;
  name: string;
  package: string;
  memoryBytes: number;
  protected: boolean;
  protectionReason: string | null;
  icon?: string | null;
};
export type PresetAppInfo = {
  id: string;
  name: string;
  package: string;
  installed: boolean;
  running: boolean;
};
