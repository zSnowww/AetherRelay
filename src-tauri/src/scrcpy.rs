//! scrcpy process management: start, stop, FPS telemetry, dual-pipe log capture.

use crate::adb::find_target_by_name_or_auto;
use crate::diagnostics::{start_telemetry_worker, DiagnosticsState, SessionTracker};
use crate::tools::{hidden_command, resolve_tool};
use crate::types::{MirrorOptions, MirrorState, ScrcpyLogEntry, ScrcpyLogLevel, ScrcpyLogSource};
use std::{
    collections::VecDeque,
    io::{BufRead, BufReader},
    process::{Child, Stdio},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{path::BaseDirectory, AppHandle, Manager, State};

// ── State types ───────────────────────────────────────────────────────────────

pub(crate) struct RunningMirror {
    pub(crate) child: Child,
    pub(crate) serial: String,
}

#[derive(Default)]
pub(crate) struct MirrorProcess(pub(crate) Mutex<Option<RunningMirror>>);

pub(crate) struct TelemetryInner {
    pub(crate) fps: Option<u32>,
    pub(crate) logs: VecDeque<ScrcpyLogEntry>,
    pub(crate) warning_count: u32,
    pub(crate) observed_dropped_frames: Option<u32>,
}

impl Default for TelemetryInner {
    fn default() -> Self {
        Self {
            fps: None,
            logs: VecDeque::with_capacity(500),
            warning_count: 0,
            observed_dropped_frames: None,
        }
    }
}

pub(crate) struct MirrorTelemetry(pub(crate) Arc<Mutex<TelemetryInner>>);

impl Default for MirrorTelemetry {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(TelemetryInner::default())))
    }
}

// ── Line Parsing ──────────────────────────────────────────────────────────────

pub(crate) fn fps_from_line(line: &str) -> Option<u32> {
    let index = line.to_ascii_lowercase().find(" fps")?;
    line[..index].split_whitespace().last()?.parse::<u32>().ok()
}

pub(crate) fn parse_log_line(line: &str) -> (ScrcpyLogSource, ScrcpyLogLevel, String) {
    let source = if line.starts_with("[server]") {
        ScrcpyLogSource::Server
    } else {
        ScrcpyLogSource::Client
    };

    let upper = line.to_uppercase();
    let level = if upper.contains("ERROR") || upper.contains("ERR:") || upper.contains("FATAL") {
        ScrcpyLogLevel::Error
    } else if upper.contains("WARN") {
        ScrcpyLogLevel::Warn
    } else if upper.contains("DEBUG") || upper.contains("VERBOSE") {
        ScrcpyLogLevel::Debug
    } else {
        ScrcpyLogLevel::Info
    };

    (source, level, line.to_string())
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub(crate) fn start_mirror(
    options: MirrorOptions,
    process: State<'_, MirrorProcess>,
    telemetry: State<'_, MirrorTelemetry>,
    diagnostics: State<'_, DiagnosticsState>,
    app: AppHandle,
) -> Result<MirrorState, String> {
    if options.serial.trim().is_empty() {
        return Err("请先选择设备".into());
    }
    let scrcpy = resolve_tool("scrcpy", &app).ok_or("未找到 scrcpy，请重新安装 Aether Relay")?;
    let adb = resolve_tool("adb", &app).ok_or("未找到 adb，请重新安装 Aether Relay")?;

    if options.virtual_display {
        let sdk = crate::adb::android_sdk(&adb, &options.serial)?;
        if sdk < 29 {
            return Err(format!(
                "独立投屏需要 Android 10 或更高版本: 当前设备为 SDK {sdk}"
            ));
        }
    }

    let mut guard = process.0.lock().map_err(|_| "镜像进程状态不可用")?;
    if let Some(running) = guard.as_mut() {
        if running
            .child
            .try_wait()
            .map_err(|e| e.to_string())?
            .is_none()
        {
            return Err("镜像已经在运行".into());
        }
        *guard = None;
    }

    let mut arguments = vec![
        "--serial".to_string(),
        options.serial.clone(),
        "-K".to_string(),
        "-M".to_string(),
        "--mouse-bind=++++:++++".to_string(),
        "--max-size".to_string(),
        options.max_size.to_string(),
        "--video-bit-rate".to_string(),
        format!("{}M", options.video_bit_rate_mbps),
        "--max-fps".to_string(),
        options.max_fps.to_string(),
        "--print-fps".to_string(),
        "--window-title".to_string(),
        "Aether Mirror".to_string(),
    ];

    if let Some(shortcut_mod) = options.shortcut_mod.filter(|v| !v.trim().is_empty()) {
        arguments.push("--shortcut-mod".to_string());
        arguments.push(shortcut_mod);
    }
    if let Some(ref codec) = options
        .video_codec
        .filter(|c| !c.trim().is_empty() && c != "auto")
    {
        arguments.push("--video-codec".to_string());
        arguments.push(codec.clone());
    }
    if let Some(ref codec) = options
        .audio_codec
        .filter(|c| !c.trim().is_empty() && c != "auto")
    {
        arguments.push("--audio-codec".to_string());
        arguments.push(codec.clone());
    }
    if let Some(ms) = options.audio_buffer_ms.filter(|&ms| ms > 0) {
        arguments.push(format!("--audio-buffer={ms}"));
    }
    if let Some(ms) = options.video_buffer_ms {
        arguments.push(format!("--video-buffer={ms}"));
    }
    if options.virtual_display {
        let height = options.max_size.saturating_mul(9) / 16;
        arguments.push(format!("--new-display={}x{}", options.max_size, height));
        arguments.push("--display-ime-policy=local".to_string());
    }
    if options.turn_screen_off && !options.virtual_display {
        arguments.push("--turn-screen-off".to_string());
    }
    if options.stay_awake {
        arguments.push(
            if options.virtual_display {
                "--keep-active"
            } else {
                "--stay-awake"
            }
            .to_string(),
        );
    }
    if options.fullscreen {
        arguments.push("--fullscreen".to_string());
    }
    if !options.audio {
        arguments.push("--no-audio".to_string());
    }
    if options.always_on_top {
        arguments.push("--always-on-top".to_string());
    }
    // In diagnostic mode, ask scrcpy for debug verbosity to capture the hardware encoder name
    if options.video_buffer_ms.is_some() || options.force_wayland.is_some() {
        arguments.push("--verbosity=debug".to_string());
    }

    if options.launch_panda_mouse_pro || options.virtual_display {
        let pkg_to_start = if let Some(ref custom_pkg) = options.launch_app_package {
            if !custom_pkg.trim().is_empty() {
                custom_pkg.clone()
            } else if let Ok(Some((_, pkg))) =
                find_target_by_name_or_auto(&adb, &options.serial, options.target_app.as_deref())
            {
                pkg
            } else {
                "com.zjx.ztezscreenshot".to_string()
            }
        } else if let Ok(Some((_, pkg))) =
            find_target_by_name_or_auto(&adb, &options.serial, options.target_app.as_deref())
        {
            pkg
        } else {
            "com.zjx.ztezscreenshot".to_string()
        };
        arguments.push(format!("--start-app={pkg_to_start}"));
    }

    let mut command = hidden_command(&scrcpy);
    command.args(&arguments);

    #[cfg(windows)]
    {
        let tools_dir = scrcpy.parent().ok_or("无法定位 scrcpy 工具目录")?;
        command.current_dir(tools_dir);
    }
    command.env("ADB", &adb);

    if options.force_wayland == Some(true) {
        command.env("SDL_VIDEODRIVER", "wayland");
    }

    #[cfg(not(windows))]
    {
        if let Ok(server) = app
            .path()
            .resolve("tools/scrcpy-server", BaseDirectory::Resource)
        {
            if server.is_file() {
                command.env("SCRCPY_SERVER_PATH", server);
            }
        }
    }

    // Capture BOTH stdout and stderr concurrently to prevent buffer deadlocks
    let mut child = command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 scrcpy 失败: {e}"))?;

    // Reset telemetry
    let telemetry_arc = telemetry.0.clone();
    if let Ok(mut t) = telemetry_arc.lock() {
        t.fps = None;
        t.logs.clear();
        t.warning_count = 0;
        t.observed_dropped_frames = None;
    }

    // Set up new session tracker & telemetry worker
    let tracker = Arc::new(SessionTracker::new(options.serial.clone()));
    if options.force_wayland == Some(true) {
        if let Ok(mut pipe) = tracker.pipeline.lock() {
            pipe.display_backend = Some("Wayland (forced)".into());
        }
    }

    // Stop prior session if one was running
    if let Ok(mut diag_guard) = diagnostics.0.lock() {
        if let Some(ref old_tracker) = *diag_guard {
            old_tracker.stop("NewSessionStarted".into());
        }
        *diag_guard = Some(tracker.clone());
    }

    // Start background probe coordinator
    start_telemetry_worker(tracker.clone(), adb.to_string_lossy().to_string());

    // ── Thread A: Drain stdout (FPS, banner, video encoder) ────────────────────
    if let Some(stdout) = child.stdout.take() {
        let t_inner = telemetry_arc.clone();
        let tracker_stdout = tracker.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                let elapsed = tracker_stdout.elapsed_ms();
                let (source, level, msg) = parse_log_line(&line);

                if let Some(fps_val) = fps_from_line(&line) {
                    if let Ok(mut current) = t_inner.lock() {
                        current.fps = Some(fps_val);
                    }
                }

                // Check version
                if line.starts_with("scrcpy ") {
                    if let Ok(mut v) = tracker_stdout.scrcpy_version.lock() {
                        *v = Some(line.clone());
                    }
                }

                // Check encoder
                if line.contains("Creating encoder by name:") || line.contains("--video-encoder=") {
                    if let Some(enc) = line.split('\'').nth(1).or_else(|| line.split('=').nth(1)) {
                        let clean = enc.split_whitespace().next().unwrap_or(enc);
                        if let Ok(mut p) = tracker_stdout.pipeline.lock() {
                            p.encoder = Some(clean.to_string());
                        }
                    }
                }

                // Check decoder
                if line.contains("Using decoder") || line.contains("Decoder:") {
                    if let Ok(mut p) = tracker_stdout.pipeline.lock() {
                        p.decoder = Some(line.clone());
                        p.hardware_decoding = Some(!line.to_lowercase().contains("software"));
                    }
                }

                // Check renderer
                if line.contains("Renderer:") {
                    if let Ok(mut p) = tracker_stdout.pipeline.lock() {
                        p.renderer = Some(line.clone());
                    }
                }

                if let Ok(mut current) = t_inner.lock() {
                    if current.logs.len() >= 500 {
                        current.logs.pop_front();
                    }
                    current.logs.push_back(ScrcpyLogEntry {
                        elapsed_ms: elapsed,
                        source,
                        level,
                        message: msg,
                    });
                }
            }
        });
    }

    // ── Thread B: Drain stderr (warnings, frame drops, server errors) ──────────
    if let Some(stderr) = child.stderr.take() {
        let t_inner = telemetry_arc.clone();
        let tracker_stderr = tracker.clone();
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                let elapsed = tracker_stderr.elapsed_ms();
                let (source, level, msg) = parse_log_line(&line);

                let is_drop = line.contains("Dropping frame");
                let is_warn = level == ScrcpyLogLevel::Warn || level == ScrcpyLogLevel::Error;

                if let Ok(mut current) = t_inner.lock() {
                    if is_drop {
                        let prev = current.observed_dropped_frames.unwrap_or(0);
                        current.observed_dropped_frames = Some(prev + 1);
                    }
                    if is_warn {
                        current.warning_count = current.warning_count.saturating_add(1);
                    }

                    if current.logs.len() >= 500 {
                        current.logs.pop_front();
                    }
                    current.logs.push_back(ScrcpyLogEntry {
                        elapsed_ms: elapsed,
                        source,
                        level,
                        message: msg,
                    });
                }
            }
        });
    }

    let state = MirrorState {
        running: true,
        pid: Some(child.id()),
        serial: Some(options.serial.clone()),
    };
    *guard = Some(RunningMirror {
        child,
        serial: options.serial,
    });
    Ok(state)
}

#[tauri::command]
pub(crate) fn stop_mirror(
    process: State<'_, MirrorProcess>,
    telemetry: State<'_, MirrorTelemetry>,
    diagnostics: State<'_, DiagnosticsState>,
) -> Result<MirrorState, String> {
    let mut guard = process.0.lock().map_err(|_| "镜像进程状态不可用")?;
    if let Some(mut running) = guard.take() {
        running
            .child
            .kill()
            .map_err(|e| format!("停止 scrcpy 失败: {e}"))?;
        let _ = running.child.wait();
    }
    if let Ok(mut value) = telemetry.0.lock() {
        value.fps = None;
    }
    if let Ok(diag_guard) = diagnostics.0.lock() {
        if let Some(ref tracker) = *diag_guard {
            tracker.stop("ManualStop".into());
        }
    }
    Ok(MirrorState {
        running: false,
        pid: None,
        serial: None,
    })
}

#[tauri::command]
pub(crate) fn mirror_fps(telemetry: State<'_, MirrorTelemetry>) -> Option<u32> {
    telemetry.0.lock().ok().and_then(|t| t.fps)
}

#[tauri::command]
pub(crate) fn mirror_state(
    process: State<'_, MirrorProcess>,
    diagnostics: State<'_, DiagnosticsState>,
) -> Result<MirrorState, String> {
    let mut guard = process.0.lock().map_err(|_| "镜像进程状态不可用")?;
    let Some(running) = guard.as_mut() else {
        return Ok(MirrorState {
            running: false,
            pid: None,
            serial: None,
        });
    };
    if running
        .child
        .try_wait()
        .map_err(|e| e.to_string())?
        .is_some()
    {
        *guard = None;
        if let Ok(diag_guard) = diagnostics.0.lock() {
            if let Some(ref tracker) = *diag_guard {
                tracker.stop("UnexpectedExit".into());
            }
        }
        return Ok(MirrorState {
            running: false,
            pid: None,
            serial: None,
        });
    }
    Ok(MirrorState {
        running: true,
        pid: Some(running.child.id()),
        serial: Some(running.serial.clone()),
    })
}

#[tauri::command]
pub(crate) fn get_scrcpy_logs(
    limit: Option<usize>,
    telemetry: State<'_, MirrorTelemetry>,
) -> Vec<ScrcpyLogEntry> {
    if let Ok(guard) = telemetry.0.lock() {
        let count = limit.unwrap_or(guard.logs.len()).min(guard.logs.len());
        let skip = guard.logs.len().saturating_sub(count);
        guard.logs.iter().skip(skip).cloned().collect()
    } else {
        Vec::new()
    }
}

#[tauri::command]
pub(crate) fn clear_scrcpy_logs(telemetry: State<'_, MirrorTelemetry>) {
    if let Ok(mut guard) = telemetry.0.lock() {
        guard.logs.clear();
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fps_from_line_parses_correctly() {
        assert_eq!(fps_from_line("Capturing at 60 fps"), Some(60));
        assert_eq!(fps_from_line("[scrcpy] 45 fps"), Some(45));
    }

    #[test]
    fn fps_from_line_returns_none_when_absent() {
        assert_eq!(fps_from_line("no frame rate here"), None);
        assert_eq!(fps_from_line(""), None);
    }

    #[test]
    fn parse_log_line_identifies_server_and_levels() {
        let (src, lvl, _) = parse_log_line("[server] WARN: Dropping frame");
        assert_eq!(src, ScrcpyLogSource::Server);
        assert_eq!(lvl, ScrcpyLogLevel::Warn);

        let (src, lvl, _) = parse_log_line("INFO: Connected to device");
        assert_eq!(src, ScrcpyLogSource::Client);
        assert_eq!(lvl, ScrcpyLogLevel::Info);

        let (src, lvl, _) = parse_log_line("[server] ERROR: Decoder failed");
        assert_eq!(src, ScrcpyLogSource::Server);
        assert_eq!(lvl, ScrcpyLogLevel::Error);
    }
}
