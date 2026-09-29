# Security Policy

## Supported versions

Only the latest release is actively maintained. If you find a vulnerability,
please report it against the current version.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Please report security issues privately via GitHub's
[Security Advisory](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
feature (Security → Report a vulnerability on the repository page).

Include:
- A clear description of the issue.
- Steps to reproduce or a proof-of-concept.
- Potential impact and affected versions.

We aim to acknowledge reports within **5 business days** and to issue a fix
or mitigation within **30 days** for confirmed critical issues.

## Scope

The following are in scope:

- **Rust backend commands** — especially privilege escalation, path traversal,
  or unintended process termination (`terminate_process`, `start_mirror`, etc.).
- **Tauri CSP and IPC boundary** — any way for web content to invoke commands
  or access resources outside the declared capabilities.
- **Bundled binary integrity** — the `tools:prepare` step pins SHA-256 checksums
  for `adb` and `scrcpy`; bypasses of that verification are in scope.

The following are **out of scope**:

- Vulnerabilities in `adb`, `scrcpy`, or Android itself.
- Issues requiring physical access to the host machine or the Android device.
- Social engineering attacks.

## Known security controls

| Control | Implementation |
|---|---|
| Process ownership check | `terminate_process` reads `/proc/<pid>` UID before sending SIGTERM |
| Session isolation | `system_stats` lists only processes owned by the current UID |
| No network access | The app communicates only via local ADB; CSP blocks external `connect-src` |
| Binary verification | SHA-256 checksums are pinned in `scripts/prepare-tools.mjs` |
