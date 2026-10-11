# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Session Diagnostics & Stutter/Delay Testing Toolkit**:
  - **Dual-Pipe Real-Time Telemetry**: Multi-threaded concurrent draining of scrcpy `stdout` and `stderr` into an in-memory 500-line ring buffer (`ScrcpyLogEntry`), eliminating telemetry blindness and pipe deadlocks.
  - **Staggered Probe Coordinator**: Independent low-overhead probes with strict timeouts, background stdout draining (128 KB cap), and child process reaping for ADB command latency (every 2s, 1.5s timeout), battery temperature & 7-level Android `ThermalStatus` (every 4s), and Linux sysfs USB link speed negotiation (`/sys/bus/usb/devices/<port>/speed`) with transport ID reconnect tracking (every 10s).
  - **Stutter Incident Bookmarking**: 1-click and global hotkey incident marker capturing samples from -60s prior and deferred +30s following windows (`BookmarkState::Collecting` -> `Complete` or `Interrupted`).
  - **Global IPC Compositor Integration**: Added local IPC socket and `--mark-stutter` CLI trigger (`aether-relay --mark-stutter`), enabling seamless Hyprland/Wayland compositor keybindings during full-screen gameplay without window focus.
  - **Video Pipeline Telemetry**: Auto-detection of Android hardware encoder, host video decoder, display backend (Wayland vs Auto), and observed dropped frame warnings parsed across both stdout and stderr.
  - **Controlled Test Baseline & Display Tuning**: 1-click control preset (1920 px max, 60 FPS, H.264, 8 Mbps, Audio OFF, buffer 0 ms), native Wayland toggle (`SDL_VIDEODRIVER=wayland`), and video jitter buffer selector (0 ms, 10 ms, 20 ms).
  - **Privacy-Preserving JSON Exporter**: Schema v1 diagnostic exporter with automatic serial number masking, IPv4 LAN masking, and personal filesystem path redaction (Windows `%USERPROFILE%` and Linux `$HOME`).
  - **Interactive Root-Cause Isolator**: Step-by-step diagnostic guide to isolate display latency versus UHID input queue backpressure.
  - **Full Tri-lingual Localization**: Complete UI translations across Spanish (`es`), English (`en`), and Chinese (`zh-CN`).

### Changed
- **Eliminated HUD Mock & Fallback Metrics**: Replaced misleading fallback values (60 FPS, 480 Mbps, hardcoded Qualcomm encoder) with truthful `—` / `N/A` indicators when telemetry has not yet been measured or is unavailable.
- **Separated Host Decoder from Display Backend**: Split display backend (Wayland / Auto) and hardware video decoder into distinct metadata fields.
- **Decoupled Diagnostic Export Download**: Separated clipboard copy from JSON file download so clipboard permission denials on Wayland never block report downloads.

### Fixed
- **Unified Scrcpy Telemetry with Session Diagnostics**: Linked `TelemetryInner` state directly to `SessionTracker`, ensuring live capture FPS, warning counts, and dropped frames are accurately recorded in session snapshots, historical samples, and stutter bookmarks.
- **Concurrent Collecting Bookmarks**: Replaced single active bookmark ID with concurrent updates across all active `BookmarkState::Collecting` instances, allowing rapid consecutive markers to capture their full deferred windows independently.
- **ADB Pipe Buffer Deadlock Prevention**: Drained probe child stdout concurrently in dedicated threads with a 128 KB limit, preventing OS pipe buffer full deadlocks on large `dumpsys` outputs.
- **Monotonic Probe Interval Deadlines**: Switched probe scheduler to `Instant`-based deadlines, eliminating measurement interval drift caused by slow probes.
- **Timeline Stutter Visual Markers**: Derived visual sparkline incident markers from `StutterBookmark.elapsedMs` and flagged samples, ensuring all marked incidents display prominently on the latency graph.
- **Auto-Updater Check Resolution**: Resolved `Could not check for updates` failure caused by missing `latest.json` release manifest on GitHub Releases, and added graceful fallback handling in `PreferencesPanel` for 404/ReleaseNotFound states when running the latest release version.

## [0.2.0] - 2026-10-10

### Added
- Real-time Android App Icon Extraction: Extracts high-resolution app launcher icons directly from device APK assets over ADB, streaming PNG/WEBP bytes into Base64 data URLs with an in-memory session cache (`ICON_CACHE`) and fallback gradient initials avatars.
- Complete Phone Process Management: Expanded process detection using Android's full `Total PSS by process` dumpsys memory metrics, listing all active application packages, primary PIDs, memory usage, and protection statuses on par with the Host PC process list.
- Individual Phone App Termination: Added individual `X` termination buttons for optimizable Android apps with dedicated glassmorphic confirmation modals and quick batch select/deselect controls for Game Boost.
- Granular Android Game Boost process list: shows running third-party apps by reported RAM and lets the user choose precisely which apps to close.
- Game Boost now reports the precise number of managed apps closed and the measured RAM change before and after the operation.

### Changed
- Transformed the phone processes UI from cramped cards into full-width structured process rows matching the desktop process list aesthetic with app icons, PIDs, memory, and status badges.
- Enhanced package protection logic to automatically protect games (Free Fire), mappers (Panda Mouse Pro, Shizuku), and core Android system infrastructure (SystemUI, Settings, Telephony, Keyboards, Launchers) from accidental termination.
- Game Boost now closes only third-party apps explicitly selected by the user, and no longer runs global Android task or cache purges.
- Free Fire, Free Fire MAX, Shizuku, and supported GG Mouse/Panda mapper packages are protected from Android Game Boost termination.

### Fixed
- Fixed foreground app safety: implemented generic window focus detection (`foreground_package`) to guard any active foreground game or application from termination during Game Boost and individual app kills, and automatically flag foreground apps as protected in process listings.
- Fixed black screen on application startup under Linux (Wayland / Hyprland) by configuring `WEBKIT_DISABLE_DMABUF_RENDERER=1` in `src-tauri/src/main.rs`.
- Fixed `Text file busy (os error 26)` build failures during packaging by automatically stopping background ADB server processes in `scripts/package.mjs`.
- Fixed Next.js static asset export configuration by adding `images: { unoptimized: true }` in `next.config.mjs`.
- Fixed ADB device auto-discovery: removed the `document.hasFocus()` restriction on device polling, probed immediately on mount, displayed unauthorized devices with status badges, and synchronized device selection automatically in `src/app/page.tsx`.
- Production builds now use the TypeScript compiler API, avoiding the Next.js CLI `--showConfig` parsing failure that prevented Tauri packages from being created.
- App termination requests are validated against that allow-list before they reach ADB.
- Auto-updater client integration using `@tauri-apps/plugin-updater` with GitHub Releases endpoint.
- "Check for updates" button and real-time status feedback inside the Preferences panel.
- Integrated settings panel architecture replacing disjointed cards with cohesive rows and compact icon spacing.

## [0.1.7] - 2026-09-29

### Added
- **Android Game Boost**: 1-click RAM cleaner and background task trimmer via ADB (`am kill-all` & `pm trim-caches`).
- **Heavy Background Apps Manager**: Real-time detection of installed RAM-heavy Android apps (Google Chrome, YouTube, TikTok, Facebook, Instagram, Twitter/X, Discord, Spotify, Firefox) with live `ps -A` execution tracking.
- **Batch & Individual App Termination**: Ability to force-stop all running preset apps or individual target apps directly from the desktop.
- **Custom Non-Native Modals & HUD Toasts**: Glassmorphic `ConfirmModal` and console-styled `ToastContainer` adhering to the `~dev/aether` design system, eliminating native browser dialogs.
- **Dynamic Theme-Reactive SVG Logo**: Vector logo component (`AetherLogo`) dynamically inheriting `--lime`, `--surface`, and `--bg` CSS variables.
- **Atmospheric Dark Themes**: Multi-palette styling (Aether Lime, Cyber Cyan, Stealth Violet, Sakura Pink, Solar Amber) with dual ambient radial glows and tinted panels, replacing flat pitch black.
- **Expanded Audio & Video Preferences**: Codec pickers (H.264, H.265, AV1, Opus, RAW, FLAC), buffer latency presets (0 ms low-latency gaming vs 50 ms smooth), theme chips, language switcher, and modifier key selectors.
- **Key Repeat Diagnostics**: In-app guidance to troubleshoot WASD/joystick stuttering caused by OS key repeat policies.

### Changed
- Replaced static `img` logo in the main header with reactive SVG component.
- Polished Performance panel layout with dedicated Phone and PC RAM metric cards.

### Fixed
- Fixed scrollbar collision in the host process list overlapping process termination buttons using `scrollbar-gutter: stable` and safety padding.
- Fixed black screen upon launching release binary by enforcing production static asset bundling (`npx tauri build --no-bundle`).

### Removed
- Removed legacy Panda desktop entries, obsolete AppImages, and duplicate application icons.

## [0.1.6] - 2026-09-28

### Added
- Dual RAM monitoring: Host PC memory metrics alongside Android device RAM stats via ADB `dumpsys meminfo`.
- Next.js Turbopack migration and static HTML export pipeline.
- Multilingual support for English, Spanish, and Simplified Chinese.

### Changed
- Refactored frontend state management with custom device and mirror hooks (`useDevices`, `useMirror`).
- Upgraded scrcpy runtime arguments to support high-frame-rate low-latency gaming.

## [0.1.5] - 2026-09-22

### Added
- Support for GG Mouse Pro activation scripts alongside Panda Mouse Pro.
- Automatic target app detector (`targetApp: "auto"`) discovering whether Panda Mouse Pro, Gamepad Pro, Touch Pro, or GG Mouse Pro is installed.
- Live activation progress log modal with real-time step-by-step diagnostic breakdown.

### Fixed
- Resolved ADB port collisions and zombie daemon cleanup when stopping mirror sessions.

## [0.1.4] - 2026-09-18

### Added
- Experimental independent display mode (`--new-display`) support on Android 10+ devices.
- Audio forwarding toggle and customizable video bitrate controls (8–32 Mbps).

### Changed
- Improved device polling performance with debounced USB connect/disconnect detection.

### Fixed
- Audio buffer underruns on Linux PulseAudio and PipeWire audio backends.

## [0.1.3] - 2026-09-15

### Added
- Shortcut modifier key configuration (`--shortcut-mod`) allowing selection between Alt, Super, and Ctrl.
- Fullscreen mode on start and stay-awake flags for uninterrupted gaming sessions.

### Changed
- Updated embedded scrcpy release to v4.1 across Windows, macOS, and Linux bundles.

### Fixed
- Window positioning and initial viewport sizing issues on multi-monitor setups.

## [0.1.2] - 2026-09-10

### Added
- Portable tool bundler (`scripts/prepare-tools.mjs`) automatically pulling and validating platform-specific `adb` and `scrcpy` binaries.
- Automated macOS Apple Silicon (arm64) and Intel (x64) notarization workflow in GitHub Actions.
- NSIS installer pre-install hooks on Windows to safely stop ADB server before upgrades.

### Fixed
- Permission issues when executing non-root daemon injection scripts on Android 12+.

## [0.1.1] - 2026-09-05

### Added
- Raw mouse mode flags (`-K`, `-M`, `--mouse-bind=++++:++++`) for direct, uncaptured camera control in shooter games.
- Turn screen off on mirror start (`--turn-screen-off`) to save device battery and prevent thermal throttling.

### Fixed
- Mouse capture release shortcut behavior on Linux desktop environments.

## [0.1.0] - 2026-09-01

### Added
- Initial release of Aether Relay desktop client.
- Low-latency screen mirroring and direct keyboard/mouse forwarding using scrcpy.
- Keymapper activation script injector for Panda Mouse Pro.
- Device discovery and connection status indicators over USB and Wi-Fi.
