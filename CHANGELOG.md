# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
