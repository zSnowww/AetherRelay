# Contributing

Thank you for your interest in contributing to Aether Relay!

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Rust** | stable (≥ 1.77) | Install via [rustup](https://rustup.rs/) |
| **Node.js** | ≥ 24 LTS | |
| **npm** | bundled with Node | |
| **adb** | any recent | For testing device features |
| **scrcpy** | ≥ 2.0 | For testing mirror features |

Linux also requires the Tauri system libraries:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

## Development setup

```bash
git clone https://github.com/zsnow/AetherRelay.git
cd AetherRelay
npm install
npm run tauri dev     # starts the Next.js dev server and Tauri in watch mode
```

> **Note**: `npm run tools:prepare` downloads bundled `adb`/`scrcpy` binaries and
> verifies their SHA-256 checksums. This step is required for **release builds** but
> is not needed during development if you already have both tools on your `$PATH`.

## Project structure

```
src/                   Next.js frontend (React + TypeScript)
  app/page.tsx         Main view — routing between mirror / performance / preferences
  components/          UI components, each receiving a t() prop for i18n
  hooks/               useDevices, useMirror
  i18n.ts              All user-visible strings in en / es / zh-CN

src-tauri/src/         Rust backend (Tauri commands)
  lib.rs               Entry point — registers all Tauri commands
  tools.rs             adb / scrcpy binary detection
  adb.rs               Device listing, app activation / deactivation
  scrcpy.rs            Mirror process lifecycle, FPS telemetry
  system.rs            /proc-based system stats, safe process termination
  types.rs             Shared data types
```

See [`docs/architecture.md`](docs/architecture.md) for a fuller description.

## Running tests

```bash
# Rust unit tests
cargo test --manifest-path src-tauri/Cargo.toml

# TypeScript type check
npx tsc --noEmit

# Rust lints (CI enforces zero warnings)
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

## Pull request guidelines

1. Keep PRs focused — one concern per PR.
2. All CI checks must pass.
3. Add or update tests when changing behaviour.
4. Follow the existing code style (rustfmt for Rust, Prettier defaults for TypeScript).

## Releasing a new version

Use the [`scripts/bump-version.sh`](scripts/bump-version.sh) script:

```bash
bash scripts/bump-version.sh 0.2.0
```

This updates all version fields, commits the change, tags the commit, and pushes.
The release CI workflow then builds installers and uploads them to the GitHub release.
