<div align="center">

<img src="public/aether-logo.svg" alt="Aether Relay Logo" width="72" height="72" />

# Aether Relay

**High-performance Android screen mirroring and hardware keymapping bridge for desktop.**

[![License](https://img.shields.io/badge/license-Apache_2.0-blue.svg)](LICENSE)
[![Tauri v2](https://img.shields.io/badge/built_with-Tauri_v2-ffc13d.svg)](https://tauri.app/)
[![Next.js 16](https://img.shields.io/badge/frontend-Next.js_16-black.svg)](https://nextjs.org/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

[Website](https://zsnow.dev) • [Releases](https://github.com/zSnowww/AetherRelay/releases) • [Architecture](docs/architecture.md) • [Contributing](CONTRIBUTING.md)

</div>

---

Aether Relay is a cross-platform desktop application built with Tauri 2 and Next.js that lets you play Android games on your computer using native mechanical keyboards and gaming mice. It integrates official portable builds of [scrcpy](https://github.com/Genymobile/scrcpy) with an automated, unrooted activation bridge for supported keymappers including **GG Mouse Pro**, **Panda Mouse Pro**, and **Shizuku**.

## Features

- **Low-Latency Display Mirroring:** Powered by `scrcpy` over USB or wireless ADB, supporting up to 120 FPS, resolutions up to 4K, and customizable bitrates (8 to 48 Mbps).
- **Physical Input Forwarding:** Uses direct hardware injection flags (`-K -M`) to route physical keyboard and mouse events directly to the Android kernel.
- **Unrooted Keymapper Activation:** Automated ADB activation script execution with real-time log output and status verification.
- **Virtual Display Mode:** Run games in an independent virtual display on desktop while keeping your phone's primary screen unlocked and accessible (Android 10+).
- **Dual RAM & Process Monitor:** Real-time RAM telemetry for both the connected Android device (diagnosing gaming stutter, GC pauses, and memory pressure) and the host PC, with safe process termination.
- **Full Internationalization:** Native support for English, Spanish, and Simplified Chinese.
- **Zero Telemetry:** Fully local execution with no analytics, trackers, or remote telemetry.

## Quick Start

### 1. Enable USB Debugging on Android
1. Go to **Settings > About phone**.
2. Tap **Build number** 7 times to unlock Developer options.
3. Open **Developer options** and enable **USB debugging**.

### 2. Connect Device
Connect your phone to your computer with a data-capable USB cable. When the authorization dialog appears on your phone, choose **Always allow from this computer**.

### 3. Launch & Play
1. Select your device from the list in Aether Relay.
2. Click **Activate Keymapper** (`Activar Mapeador`).
3. Once activation completes, click **Start Mirror** (`Iniciar Espejo`).

## Keymapper Activation & Security

Aether Relay operates strictly through standard Android Debug Bridge (ADB) APIs without requiring root privileges:

- **No System Partition Changes:** Does not modify `/system`, flash custom ROMs, or unlock the bootloader. Knox warranty counters, SafetyNet, and Google Play Integrity remain unaffected.
- **In-Memory Daemon Execution:** Launches the keymapper's official service (`inject_server` or Shizuku start script) under Android's standard `shell` UID (2000). The process runs entirely in RAM.
- **Deterministic Cleanup:** Clicking **Deactivate Keymapper** terminates all associated mapper processes and temporary scripts. Rebooting the device also clears all running services automatically.

## Known Issues

### Key Repeat in Games (WASD / Joystick Jitter)
Holding down movement keys (such as `W`) on certain desktop environments can trigger OS-level key repeat events, interfering with Android's continuous touch simulation.

To prevent joystick stuttering:
- **Wayland (Hyprland / Sway):** Set `repeat_rate = 0` in your compositor configuration during gameplay.
- **X11 (Linux):** Run `xset r off` before launching the game, and `xset r on` when finished.
- **Windows:** Lower the keyboard repeat rate in Control Panel, or enable FilterKeys.

## Development

### Prerequisites
- Node.js (v18 or later)
- Rust toolchain (stable, 1.77 or later)
- Platform build libraries (e.g. `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev` on Linux)

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/zsnow/AetherRelay.git
cd AetherRelay

# Install dependencies
npm install

# Run development server with Tauri desktop window
npm run tauri dev
```

### Building Release Binaries
```bash
# Prepare production frontend bundle
npm run build

# Package desktop installer for current platform
npm run tauri build
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines, coding style, and local testing instructions. Security vulnerability disclosures should follow the policy outlined in [SECURITY.md](SECURITY.md).

## License

Source code is released under the [Apache License, Version 2.0](LICENSE).  
Third-party component licenses and scrcpy distribution notices are documented in [`THIRD_PARTY_NOTICES.txt`](src-tauri/resources/THIRD_PARTY_NOTICES.txt) and [`NOTICE`](NOTICE).
