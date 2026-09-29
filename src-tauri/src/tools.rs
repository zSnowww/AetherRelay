//! Tool resolution: find and probe `adb` and `scrcpy` binaries.

use crate::types::{EnvironmentStatus, ToolInfo};
use std::{
    ffi::OsStr,
    path::{Path, PathBuf},
    process::Stdio,
};
use tauri::{path::BaseDirectory, AppHandle, Manager};

/// Build a [`Command`] that suppresses console windows on Windows.
pub(crate) fn hidden_command<S: AsRef<OsStr>>(program: S) -> std::process::Command {
    let command = std::process::Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        let mut command = command;
        command.creation_flags(CREATE_NO_WINDOW);
        command
    }
    #[cfg(not(windows))]
    {
        command
    }
}

/// Returns all candidate filesystem paths where `tool` might live.
pub(crate) fn candidate_paths(tool: &str, app: &AppHandle) -> Vec<PathBuf> {
    let executable = if cfg!(windows) {
        format!("{tool}.exe")
    } else {
        tool.to_string()
    };
    let mut paths = Vec::new();
    if let Ok(bundled) = app
        .path()
        .resolve(format!("tools/{executable}"), BaseDirectory::Resource)
    {
        paths.push(bundled);
    }
    paths.push(PathBuf::from(&executable));
    if cfg!(target_os = "macos") {
        paths
            .extend(["/opt/homebrew/bin", "/usr/local/bin"].map(|base| Path::new(base).join(tool)));
        if let Some(home) = std::env::var_os("HOME") {
            paths.push(
                PathBuf::from(home)
                    .join("Library/Android/sdk/platform-tools")
                    .join(tool),
            );
        }
    } else if cfg!(windows) {
        if let Some(local) = std::env::var_os("LOCALAPPDATA") {
            paths.push(
                PathBuf::from(local)
                    .join("Android/Sdk/platform-tools")
                    .join(&executable),
            );
        }
    }
    paths
}

/// Returns the first candidate path for `tool` that responds to `--version`.
pub(crate) fn resolve_tool(tool: &str, app: &AppHandle) -> Option<PathBuf> {
    candidate_paths(tool, app).into_iter().find(|candidate| {
        hidden_command(candidate)
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok()
    })
}

/// Probes a tool and returns its availability, path, and version string.
pub(crate) fn tool_info(tool: &str, app: &AppHandle) -> ToolInfo {
    let Some(path) = resolve_tool(tool, app) else {
        return ToolInfo {
            available: false,
            path: None,
            version: None,
        };
    };
    let output = hidden_command(&path).arg("--version").output().ok();
    let version = output
        .map(|out| {
            let text = if out.stdout.is_empty() {
                String::from_utf8_lossy(&out.stderr)
            } else {
                String::from_utf8_lossy(&out.stdout)
            };
            text.lines().next().unwrap_or_default().trim().to_string()
        })
        .filter(|line| !line.is_empty());
    ToolInfo {
        available: true,
        path: Some(path.to_string_lossy().into_owned()),
        version,
    }
}

/// Tauri command: check whether `adb` and `scrcpy` are available.
#[tauri::command]
pub(crate) fn check_environment(app: AppHandle) -> EnvironmentStatus {
    EnvironmentStatus {
        adb: tool_info("adb", &app),
        scrcpy: tool_info("scrcpy", &app),
    }
}
