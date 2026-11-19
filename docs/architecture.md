# Architecture

Aether Relay is a [Tauri 2](https://tauri.app/) application. The
frontend is a [Next.js](https://nextjs.org/) (React) app exported as static
HTML; the backend is a Rust library that exposes Tauri IPC commands.

## Layer diagram

```
┌─────────────────────────────────────────────────────┐
│  Frontend — Next.js (React + TypeScript)             │
│  src/app/page.tsx     ← main view, state, routing    │
│  src/components/      ← DeviceList, SettingsPanel,   │
│                          PerformancePanel,            │
│                          PreferencesPanel, FpsHud …  │
│  src/hooks/           ← useDevices, useMirror        │
│  src/i18n.ts          ← en / es / zh-CN strings      │
│  src/api.ts           ← typed wrappers for invoke()  │
└──────────────────┬──────────────────────────────────┘
                   │  Tauri IPC (invoke / listen)
┌──────────────────▼──────────────────────────────────┐
│  Backend — Rust (src-tauri/src/)                     │
│  lib.rs        ← entry point, command registration   │
│  tools.rs      ← resolve_tool(), tool_info()         │
│  device.rs     ← list_devices, SDK, packages         │
│  device_watch  ← adb track-devices → events          │
│  keymapper.rs  ← mapper registry, activate/deactivate│
│  phone.rs      ← phone RAM, close background apps    │
│  errors.rs     ← stable error codes                  │
│  scrcpy.rs     ← start/stop mirror, FPS telemetry    │
│  system.rs     ← system_stats, terminate_process     │
│  types.rs      ← shared serde types                  │
└──────────────────┬──────────────────────────────────┘
                   │  subprocess (std::process::Command)
          ┌────────┴────────┐
          │   adb (binary)  │   ← device control, app activation
          └─────────────────┘
          ┌─────────────────┐
          │ scrcpy (binary) │   ← screen mirror, keyboard/mouse forward
          └─────────────────┘
```

## Mirror startup sequence

1. User selects a device and clicks **Start Mirror**.
2. `page.tsx` → `desktopApi.start(options)` → Tauri `invoke("start_mirror", ...)`.
3. `scrcpy.rs::start_mirror` resolves `scrcpy` and `adb` paths, builds the
   argument list, spawns the `scrcpy` child process.
4. A background thread reads `scrcpy` stdout and parses FPS lines into
   `MirrorTelemetry` (an `Arc<Mutex<Option<u32>>>`).
5. `FpsHud` polls `mirror_fps` every second while `mirror.running` is true.
6. On **Stop Mirror**, `scrcpy.rs::stop_mirror` kills the child and clears state.

## Module responsibilities

| Module | Responsibility |
|---|---|
| `tools.rs` | Resolves `adb` / `scrcpy` binaries across bundled, PATH, and platform-specific locations. |
| `device.rs` | Device listing (`adb devices -l`), Android SDK version, installed and foreground packages. |
| `device_watch.rs` | Runs `adb track-devices` and emits a `devices-changed` event on every change, so the UI does not poll. |
| `keymapper.rs` | Single registry of supported mappers (packages, activation scripts, daemon process markers). Activation via `adb shell monkey` + activation scripts; deactivation via `am force-stop` and shell kill scripts. |
| `phone.rs` | Phone RAM telemetry (`/proc/meminfo`), per-app memory, heavy background app detection and protected force-stop. |
| `errors.rs` | Stable error codes (`E_CODE` or `E_CODE: detail`) returned by commands and translated by the frontend in `src/i18n.ts`. |
| `scrcpy.rs` | Full mirror lifecycle: argument construction, process spawn, stdout FPS parsing, `MirrorProcess` / `MirrorTelemetry` state management. |
| `system.rs` | Linux-only: reads `/proc/meminfo` and `/proc/<pid>/status` to build a per-user process list. `terminate_process` validates UID ownership before sending SIGTERM. |
| `types.rs` | All `#[derive(Serialize, Deserialize)]` data types shared between modules. |

## Security considerations

- **Session isolation**: `system_stats` filters `/proc` entries to the current UID,
  preventing one user's session from seeing another's processes.
- **Ownership validation**: `terminate_process` reads `/proc/<pid>` metadata and
  compares UIDs before sending any signal.
- **No outbound network from the app**: all device communication goes through ADB
  (USB or local TCP); the Tauri CSP blocks external `connect-src`.
- **Binary verification**: `scripts/prepare-tools.mjs` downloads `adb` / `scrcpy`
  release archives and verifies a pinned SHA-256 before extracting.

## i18n

All user-visible strings are in [`src/i18n.ts`](../src/i18n.ts). The source of
truth is the `zh` object; `en` and `es` are typed as `Record<keyof typeof zh, string>`,
so missing keys cause a TypeScript compile error. Backend error strings in Chinese
are mapped to `MessageKey` entries in `localizeBackendError()`.
