//! System stats and safe process termination.

use crate::types::{SystemProcess, SystemStats};
use std::fs;

#[cfg(target_os = "linux")]
use std::os::unix::fs::MetadataExt;

fn status_value<'a>(status: &'a str, key: &str) -> Option<&'a str> {
    status
        .lines()
        .find_map(|line| line.strip_prefix(key).map(str::trim))
}

/// Tauri command: read per-process memory from `/proc` (Linux only).
///
/// Only processes belonging to the current user are listed.
#[cfg(target_os = "linux")]
#[tauri::command]
pub(crate) fn system_stats() -> Result<SystemStats, String> {
    let memory = fs::read_to_string("/proc/meminfo").map_err(|e| e.to_string())?;
    let memory_kb = |name: &str| -> u64 {
        memory
            .lines()
            .find_map(|line| line.strip_prefix(name))
            .and_then(|value| value.split_whitespace().next())
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or_default()
    };
    let total_memory_bytes = memory_kb("MemTotal:").saturating_mul(1024);
    let available_memory_bytes = memory_kb("MemAvailable:").saturating_mul(1024);

    let current_pid = std::process::id();
    let current_uid = fs::metadata("/proc/self").map_err(|e| e.to_string())?.uid();

    let mut processes = fs::read_dir("/proc")
        .map_err(|e| e.to_string())?
        .filter_map(Result::ok)
        .filter_map(|entry| entry.file_name().to_string_lossy().parse::<u32>().ok())
        .filter(|pid| *pid > 1 && *pid != current_pid)
        .filter_map(|pid| {
            let base = format!("/proc/{pid}");
            if fs::metadata(&base).ok()?.uid() != current_uid {
                return None;
            }
            let status = fs::read_to_string(format!("{base}/status")).ok()?;
            let name = status_value(&status, "Name:")?.to_string();
            let memory_bytes = status_value(&status, "VmRSS:")?
                .split_whitespace()
                .next()?
                .parse::<u64>()
                .ok()?
                .saturating_mul(1024);
            let state = status_value(&status, "State:")
                .unwrap_or("Unknown")
                .to_string();
            let command = fs::read(format!("{base}/cmdline"))
                .ok()
                .map(|v| {
                    String::from_utf8_lossy(&v)
                        .replace('\0', " ")
                        .trim()
                        .to_string()
                })
                .filter(|v| !v.is_empty())
                .unwrap_or_else(|| name.clone());
            Some(SystemProcess {
                pid,
                name,
                command,
                memory_bytes,
                state,
            })
        })
        .collect::<Vec<_>>();

    processes.sort_by_key(|p| std::cmp::Reverse(p.memory_bytes));
    processes.truncate(60);

    Ok(SystemStats {
        total_memory_bytes,
        used_memory_bytes: total_memory_bytes.saturating_sub(available_memory_bytes),
        processes,
    })
}

#[cfg(not(target_os = "linux"))]
#[tauri::command]
pub(crate) fn system_stats() -> Result<SystemStats, String> {
    Err("The performance panel is currently only available on Linux.".into())
}

/// Tauri command: send SIGTERM to a process owned by the current user.
///
/// Validated before sending:
/// - PID must be > 1 and not the current process.
/// - On Linux, the target process must belong to the same UID as the app.
#[cfg(target_os = "linux")]
#[tauri::command]
pub(crate) fn terminate_process(pid: u32) -> Result<(), String> {
    if pid <= 1 || pid == std::process::id() {
        return Err("Cannot terminate that process.".into());
    }
    // Ownership check: read /proc/<pid> metadata and compare UID.
    let current_uid = fs::metadata("/proc/self").map_err(|e| e.to_string())?.uid();
    let target_uid = fs::metadata(format!("/proc/{pid}"))
        .map_err(|_| format!("Process {pid} not found or not accessible."))?
        .uid();
    if target_uid != current_uid {
        return Err(format!(
            "Process {pid} does not belong to the current user."
        ));
    }
    let status = crate::tools::hidden_command("kill")
        .args(["-TERM", &pid.to_string()])
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err(format!("Could not terminate process {pid}."))
    }
}

#[cfg(not(target_os = "linux"))]
#[tauri::command]
pub(crate) fn terminate_process(_pid: u32) -> Result<(), String> {
    Err("Process termination is only available on Linux.".into())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn terminate_process_rejects_pid_zero() {
        assert!(terminate_process(0).is_err());
    }

    #[test]
    fn terminate_process_rejects_pid_one() {
        assert!(terminate_process(1).is_err());
    }

    #[test]
    fn terminate_process_rejects_self() {
        let self_pid = std::process::id();
        assert!(terminate_process(self_pid).is_err());
    }
}
