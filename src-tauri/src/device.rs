//! Device-level adb queries: listing, SDK version, installed packages, foreground app.

use crate::errors;
use crate::tools::{hidden_command, resolve_tool};
use crate::types::Device;
use std::{collections::HashSet, path::Path};
use tauri::AppHandle;

/// Extract a human-readable error string from a command's output.
pub(crate) fn command_error(output: &std::process::Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if !stderr.is_empty() {
        return stderr;
    }
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        format!("exit code {}", output.status.code().unwrap_or(-1))
    } else {
        stdout
    }
}

/// Query the Android SDK version of a connected device.
pub(crate) fn android_sdk(adb: &Path, serial: &str) -> Result<u32, String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "getprop", "ro.build.version.sdk"])
        .output()
        .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
    if !output.status.success() {
        return Err(errors::detail(errors::ADB_FAILED, command_error(&output)));
    }
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse()
        .map_err(|_| errors::detail(errors::ADB_FAILED, "ro.build.version.sdk"))
}

pub(crate) fn is_package_installed(
    adb: &Path,
    serial: &str,
    package_name: &str,
) -> Result<bool, String> {
    let output = hidden_command(adb)
        .args([
            "-s",
            serial,
            "shell",
            "pm",
            "list",
            "packages",
            package_name,
        ])
        .output()
        .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
    if !output.status.success() {
        return Err(errors::detail(errors::ADB_FAILED, command_error(&output)));
    }
    let expected = format!("package:{package_name}");
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .any(|line| line.trim() == expected))
}

/// Return the package name of the active foreground app reported by Android's window manager.
pub(crate) fn foreground_package(adb: &Path, serial: &str) -> Option<String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "dumpsys", "window", "windows"])
        .output()
        .ok()?;
    foreground_package_from_output(&String::from_utf8_lossy(&output.stdout))
}

fn foreground_package_from_output(output: &str) -> Option<String> {
    for line in output.lines() {
        if !line.contains("mCurrentFocus") && !line.contains("mFocusedApp") {
            continue;
        }
        for token in line.split_whitespace() {
            let candidate = token
                .trim_matches(|c: char| c == '{' || c == '}' || c == ')' || c == '(' || c == ',');
            if let Some((raw_pkg, _)) = candidate.split_once('/') {
                let pkg = raw_pkg
                    .split('{')
                    .next_back()
                    .unwrap_or(raw_pkg)
                    .split('=')
                    .next_back()
                    .unwrap_or(raw_pkg)
                    .trim();
                if pkg.contains('.')
                    && !pkg.starts_with('.')
                    && !pkg.ends_with('.')
                    && !pkg.contains(' ')
                {
                    return Some(pkg.to_string());
                }
            }
        }
    }
    None
}

pub(crate) fn all_installed_packages(adb: &Path, serial: &str) -> Result<HashSet<String>, String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "pm", "list", "packages"])
        .output()
        .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
    if !output.status.success() {
        return Err(command_error(&output));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.trim().strip_prefix("package:"))
        .map(str::to_string)
        .collect())
}

// ── Device listing ────────────────────────────────────────────────────────────

fn parse_device(line: &str) -> Option<Device> {
    let mut parts = line.split_whitespace();
    let serial = parts.next()?.to_string();
    let state = parts.next()?.to_string();
    let mut device = Device {
        serial,
        state,
        model: None,
        product: None,
        transport_id: None,
    };
    for field in parts {
        if let Some((key, value)) = field.split_once(':') {
            match key {
                "model" => device.model = Some(value.replace('_', " ")),
                "product" => device.product = Some(value.to_string()),
                "transport_id" => device.transport_id = Some(value.to_string()),
                _ => {}
            }
        }
    }
    Some(device)
}

// Runs off the main thread: it spawns adb/scrcpy and can block for seconds.
#[tauri::command(async)]
pub(crate) fn list_devices(app: AppHandle) -> Result<Vec<Device>, String> {
    let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
    let output = hidden_command(adb)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .skip(1)
        .filter_map(parse_device)
        .collect())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_device_parses_connected_device() {
        let line = "emulator-5554   device product:sdk_gphone model:Android_SDK transport_id:1";
        let device = parse_device(line).unwrap();
        assert_eq!(device.serial, "emulator-5554");
        assert_eq!(device.state, "device");
        assert_eq!(device.model.as_deref(), Some("Android SDK"));
        assert_eq!(device.transport_id.as_deref(), Some("1"));
    }

    #[test]
    fn parse_device_parses_unauthorized() {
        let line = "192.168.1.100:5555   unauthorized";
        let device = parse_device(line).unwrap();
        assert_eq!(device.state, "unauthorized");
        assert!(device.model.is_none());
    }

    #[test]
    fn parse_device_skipping_is_done_by_caller() {
        // parse_device itself parses any 2-word line; the header skip is
        // the caller's responsibility (list_devices uses .skip(1)).
        let header = parse_device("List of devices attached");
        assert!(header.is_some()); // parse_device does not skip headers itself
                                   // Callers are expected to call .skip(1) on the adb output lines.
    }

    #[test]
    fn foreground_parser_extracts_any_active_package() {
        let chrome =
            "mCurrentFocus=Window{42 u0 com.android.chrome/com.google.android.apps.chrome.Main}";
        assert_eq!(
            foreground_package_from_output(chrome),
            Some("com.android.chrome".to_string())
        );
        let game = "mCurrentFocus=Window{42 u0 com.example.game/.MainActivity}";
        assert_eq!(
            foreground_package_from_output(game),
            Some("com.example.game".to_string())
        );
        let cod = "mCurrentFocus=Window{c18c214 u0 com.activision.callofduty.shooter/com.tencent.tmgp.cod.MainActivity}";
        assert_eq!(
            foreground_package_from_output(cod),
            Some("com.activision.callofduty.shooter".to_string())
        );
        let focused_app =
            "mFocusedApp=ActivityRecord{123 u0 com.supercell.clashroyale/.GameActivity t456}";
        assert_eq!(
            foreground_package_from_output(focused_app),
            Some("com.supercell.clashroyale".to_string())
        );
        let empty = "mCurrentFocus=null";
        assert_eq!(foreground_package_from_output(empty), None);
    }
}
