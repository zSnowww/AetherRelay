<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Guidelines & Engineering Standards

## 1. Versioning Standard (Semantic Versioning 2.0.0)
This project strictly follows [Semantic Versioning (SemVer 2.0.0)](https://semver.org/):
- **Format**: `MAJOR.MINOR.PATCH` (e.g. `0.1.7`).
- **MAJOR**: Breaking changes, protocol modifications, or incompatible architectural overhauls.
- **MINOR**: New features, new OS integrations, or backward-compatible enhancements (e.g., adding phone optimizer, game boost, new codec support).
- **PATCH**: Backward-compatible bug fixes, UI/UX polish, styling corrections, and minor refactors.
- **Synchronization**: Whenever the version is bumped, it must remain strictly synchronized across all project manifests:
  - `package.json`
  - `package-lock.json`
  - `src-tauri/Cargo.toml`
  - `src-tauri/Cargo.lock`
  - `src-tauri/tauri.conf.json`
  Use `scripts/bump-version.sh <version>` to bump all version targets atomically.

## 2. Changelog Standard (Keep a Changelog)
All user-facing and architectural changes must be documented in [`CHANGELOG.md`](./CHANGELOG.md) adhering to [Keep a Changelog](https://keepachangelog.com/en/1.1.0/):
- **Guiding Principles**:
  - Changelogs are for humans, not machines. Avoid dumping raw git commit logs.
  - Every release must have its own section formatted as `## [X.Y.Z] - YYYY-MM-DD`.
  - Maintain an active `## [Unreleased]` section at the very top for ongoing work before a release tag is pushed.
- **Categories per Release**:
  - `### Added`: New features, tools, or user capabilities.
  - `### Changed`: Changes in existing functionality or design.
  - `### Deprecated`: Features that will be removed in future releases.
  - `### Removed`: Features or dead dependencies removed in this release.
  - `### Fixed`: Bug fixes, layout collisions, edge case handling.
  - `### Security`: Vulnerability patches or credential/sandbox protections.
