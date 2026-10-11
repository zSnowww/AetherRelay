//! Session Diagnostics & Telemetry Coordinator.
//!
//! Provides independent, low-overhead scheduled probes for:
//! - ADB Command Latency (with strict 1500ms timeout and child process reaping)
//! - Battery temperature and 7-level Android ThermalStatus
//! - Linux sysfs USB link speed negotiation & transport_id reconnect detection
//! - Monotonic session tracking, deferred stutter bookmarks (-60s to +30s), and privacy-redacted export.

use crate::types::{
    BookmarkState, DeviceDiagnostics, DiagnosticsExport, ProbeStatus, ScrcpyDiagnostics,
    ScrcpyLogEntry, ScrcpyLogLevel, SessionDiagnostics, SessionMetadata, SessionSample,
    StutterBookmark, ThermalStatus, TransportDiagnostics, VideoPipelineMetadata,
};
use std::{
    collections::VecDeque,
    fs,
    io::Read,
    path::Path,
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{Emitter, State};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn now_utc_iso() -> String {
    let now = SystemTime::now();
    let duration = now.duration_since(UNIX_EPOCH).unwrap_or_default();
    let total_secs = duration.as_secs();
    let millis = duration.subsec_millis();

    let days = total_secs / 86400;
    let rem_secs = total_secs % 86400;
    let hours = rem_secs / 3600;
    let minutes = (rem_secs % 3600) / 60;
    let seconds = rem_secs % 60;

    // Approximate UTC date calculation
    let mut year = 1970;
    let mut remaining_days = days;
    loop {
        let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if leap { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }
    let leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let days_in_months = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 1;
    for &dim in &days_in_months {
        if remaining_days < dim {
            break;
        }
        remaining_days -= dim;
        month += 1;
    }
    let day = remaining_days + 1;

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:03}Z",
        year, month, day, hours, minutes, seconds, millis
    )
}

/// Redact sensitive information (serial numbers, usernames in Linux/Windows paths, IP addresses).
pub(crate) fn redact_string(input: &str, serial: &str) -> String {
    let mut result = input.to_string();

    // 1. Mask device serial
    if !serial.is_empty() {
        if serial.len() >= 6 {
            let prefix = &serial[..3];
            let suffix = &serial[serial.len() - 3..];
            let masked = format!("{}***{}", prefix, suffix);
            result = result.replace(serial, &masked);
        } else {
            result = result.replace(serial, "***");
        }
    }

    // 2. Redact Linux / Unix home directories and usernames
    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() && home != "/" {
            result = result.replace(&home, "~");
        }
    }
    if let Ok(user) = std::env::var("USER") {
        if !user.is_empty() {
            result = result.replace(&format!("/{}", user), "/<user>");
        }
    }

    // 3. Redact Windows user profiles and usernames (raw and JSON-escaped)
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        if !userprofile.is_empty() {
            result = result.replace(&userprofile, "C:\\Users\\<user>");
            let escaped_profile = userprofile.replace('\\', "\\\\");
            result = result.replace(&escaped_profile, "C:\\\\Users\\\\<user>");
        }
    }
    if let Ok(username) = std::env::var("USERNAME") {
        if !username.is_empty() {
            result = result.replace(&format!("\\Users\\{}", username), "\\Users\\<user>");
            result = result.replace(&format!("\\\\Users\\\\{}", username), "\\\\Users\\\\<user>");
        }
    }

    // 4. Redact LAN / wireless IP addresses
    let words: Vec<String> = result
        .split(|c: char| !c.is_alphanumeric() && c != '.')
        .filter(|w| !w.is_empty())
        .map(|w| w.to_string())
        .collect();

    for word in words {
        let parts: Vec<&str> = word.split('.').collect();
        if parts.len() == 4 {
            if let (Ok(o1), Ok(o2), Ok(o3), Ok(o4)) = (
                parts[0].parse::<u8>(),
                parts[1].parse::<u8>(),
                parts[2].parse::<u8>(),
                parts[3].parse::<u8>(),
            ) {
                if (o1 == 192 && o2 == 168) || o1 == 10 || (o1 == 172 && (16..=31).contains(&o2)) {
                    let raw_ip = format!("{o1}.{o2}.{o3}.{o4}");
                    let masked_ip = format!("{o1}.{o2}.***.***");
                    result = result.replace(&raw_ip, &masked_ip);
                }
            }
        }
    }

    result
}

/// Execute a command with strict timeout, draining stdout concurrently to prevent OS pipe deadlocks.
pub(crate) fn run_command_with_timeout(
    mut cmd: Command,
    timeout: Duration,
) -> (ProbeStatus, Option<String>, Option<Duration>) {
    let start = Instant::now();
    let mut child: Child = match cmd
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(_) => return (ProbeStatus::Unavailable, None, None),
    };

    // Take stdout to drain it concurrently so the child process never blocks on full pipe buffer
    let stdout = child.stdout.take();
    let reader_handle = thread::spawn(move || {
        let mut buffer = Vec::new();
        if let Some(mut reader) = stdout {
            let mut chunk = [0u8; 8192];
            while let Ok(n) = reader.read(&mut chunk) {
                if n == 0 {
                    break;
                }
                // Cap to 128KB to keep memory usage low while preventing buffer full lockup
                if buffer.len() < 131_072 {
                    let to_take = n.min(131_072 - buffer.len());
                    buffer.extend_from_slice(&chunk[..to_take]);
                }
            }
        }
        String::from_utf8_lossy(&buffer).to_string()
    });

    let check_interval = Duration::from_millis(20);
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let elapsed = start.elapsed();
                let output = reader_handle.join().unwrap_or_default();
                if status.success() {
                    return (ProbeStatus::Ok, Some(output), Some(elapsed));
                } else {
                    return (ProbeStatus::Unavailable, None, Some(elapsed));
                }
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    // KILL and REAP child process to guarantee no orphan / zombie processes
                    let _ = child.kill();
                    let _ = child.wait();
                    let _ = reader_handle.join();
                    return (ProbeStatus::Timeout, None, Some(start.elapsed()));
                }
                thread::sleep(check_interval);
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = reader_handle.join();
                return (ProbeStatus::Unavailable, None, None);
            }
        }
    }
}

// ── Session Tracker ───────────────────────────────────────────────────────────

pub(crate) struct SessionTracker {
    pub(crate) session_id: String,
    pub(crate) started_instant: Instant,
    pub(crate) started_at_ms: u64,
    pub(crate) started_at_utc: String,
    pub(crate) ended_at_ms: Mutex<Option<u64>>,
    pub(crate) exit_reason: Mutex<Option<String>>,
    pub(crate) device_serial: String,
    pub(crate) scrcpy_version: Mutex<Option<String>>,
    pub(crate) pipeline: Arc<Mutex<VideoPipelineMetadata>>,

    // Probed state
    pub(crate) latest_device: Arc<Mutex<DeviceDiagnostics>>,
    pub(crate) latest_transport: Arc<Mutex<TransportDiagnostics>>,
    pub(crate) latency_baseline_ms: Arc<Mutex<Option<u32>>>,
    pub(crate) reconnect_count: Arc<Mutex<u32>>,
    pub(crate) last_transport_id: Arc<Mutex<Option<String>>>,

    // Shared scrcpy telemetry
    pub(crate) scrcpy_telemetry: Arc<Mutex<crate::scrcpy::TelemetryInner>>,

    // Time-series samples & bookmarks
    pub(crate) samples: Arc<Mutex<VecDeque<SessionSample>>>,
    pub(crate) bookmarks: Arc<Mutex<Vec<StutterBookmark>>>,

    // Worker termination signal
    pub(crate) stop_signal: Arc<AtomicBool>,
}

impl SessionTracker {
    pub(crate) fn new(
        serial: String,
        scrcpy_telemetry: Arc<Mutex<crate::scrcpy::TelemetryInner>>,
    ) -> Self {
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        let session_id = format!(
            "sess_{}_{:06x}",
            now_ms,
            std::process::id() ^ (now_ms as u32)
        );

        Self {
            session_id,
            started_instant: Instant::now(),
            started_at_ms: now_ms,
            started_at_utc: now_utc_iso(),
            ended_at_ms: Mutex::new(None),
            exit_reason: Mutex::new(None),
            device_serial: serial,
            scrcpy_version: Mutex::new(None),
            pipeline: Arc::new(Mutex::new(VideoPipelineMetadata::default())),
            latest_device: Arc::new(Mutex::new(DeviceDiagnostics {
                battery_temp_c: None,
                battery_temp_status: ProbeStatus::Unavailable,
                thermal_status: None,
                thermal_status_status: ProbeStatus::Unavailable,
            })),
            latest_transport: Arc::new(Mutex::new(TransportDiagnostics {
                adb_command_latency_ms: None,
                adb_latency_status: ProbeStatus::Unavailable,
                latency_baseline_ms: None,
                usb_speed_mbps: None,
                usb_speed_status: ProbeStatus::Unavailable,
                usb_path: None,
                transport_id: None,
                reconnect_count: 0,
            })),
            latency_baseline_ms: Arc::new(Mutex::new(None)),
            reconnect_count: Arc::new(Mutex::new(0)),
            last_transport_id: Arc::new(Mutex::new(None)),
            scrcpy_telemetry,
            samples: Arc::new(Mutex::new(VecDeque::with_capacity(180))),
            bookmarks: Arc::new(Mutex::new(Vec::with_capacity(20))),
            stop_signal: Arc::new(AtomicBool::new(false)),
        }
    }

    pub(crate) fn elapsed_ms(&self) -> u64 {
        self.started_instant.elapsed().as_millis() as u64
    }

    pub(crate) fn stop(&self, reason: String) {
        self.stop_signal.store(true, Ordering::SeqCst);
        let mut exit_guard = self.exit_reason.lock().unwrap_or_else(|e| e.into_inner());
        if exit_guard.is_none() {
            *exit_guard = Some(reason);
        }
        let mut ended_guard = self.ended_at_ms.lock().unwrap_or_else(|e| e.into_inner());
        if ended_guard.is_none() {
            *ended_guard = Some(self.elapsed_ms());
        }

        // Mark any still-collecting bookmark as Interrupted
        let mut bookmarks_guard = self.bookmarks.lock().unwrap_or_else(|e| e.into_inner());
        for b in bookmarks_guard.iter_mut() {
            if b.state == BookmarkState::Collecting {
                b.state = BookmarkState::Interrupted;
            }
        }
    }
}

// ── Global Diagnostics Manager ────────────────────────────────────────────────

#[derive(Default)]
pub(crate) struct DiagnosticsState(pub(crate) Arc<Mutex<Option<Arc<SessionTracker>>>>);

// ── Worker Probing Logic ───────────────────────────────────────────────────────

/// Parse temperature in °C from `dumpsys battery`
pub(crate) fn parse_battery_temp(output: &str) -> Option<f32> {
    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("temperature:") {
            if let Some(val_str) = line.split(':').nth(1) {
                if let Ok(raw) = val_str.trim().parse::<f32>() {
                    return Some(raw / 10.0);
                }
            }
        }
    }
    None
}

/// Parse Android ThermalStatus (7 levels) from `dumpsys thermalservice`
pub(crate) fn parse_thermal_status(output: &str) -> Option<ThermalStatus> {
    for line in output.lines() {
        if line.contains("Thermal Status:") {
            if let Some(val_str) = line.split(':').nth(1) {
                let trimmed = val_str.trim();
                let status_num = trimmed.split_whitespace().next()?.parse::<i32>().ok()?;
                return Some(match status_num {
                    0 => ThermalStatus::None,
                    1 => ThermalStatus::Light,
                    2 => ThermalStatus::Moderate,
                    3 => ThermalStatus::Severe,
                    4 => ThermalStatus::Critical,
                    5 => ThermalStatus::Emergency,
                    6 => ThermalStatus::Shutdown,
                    other => ThermalStatus::Unknown(other),
                });
            }
        }
    }
    None
}

/// Parse USB speed from Linux sysfs using port e.g. "3-1" -> "/sys/bus/usb/devices/3-1/speed"
pub(crate) fn read_linux_usb_speed(usb_port: &str) -> (ProbeStatus, Option<u32>) {
    #[cfg(target_os = "linux")]
    {
        let path = format!("/sys/bus/usb/devices/{usb_port}/speed");
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(speed) = content.trim().parse::<u32>() {
                return (ProbeStatus::Ok, Some(speed));
            }
        }
        (ProbeStatus::Unavailable, None)
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = usb_port;
        (ProbeStatus::Unsupported, None)
    }
}

/// Detect device USB port & transport ID from `adb devices -l`
pub(crate) fn parse_device_transport_info(
    output: &str,
    serial: &str,
) -> (Option<String>, Option<String>) {
    for line in output.lines() {
        if line.starts_with(serial) {
            let mut usb_port = None;
            let mut transport_id = None;
            for token in line.split_whitespace() {
                if let Some(port) = token.strip_prefix("usb:") {
                    usb_port = Some(port.to_string());
                } else if let Some(tid) = token.strip_prefix("transport_id:") {
                    transport_id = Some(tid.to_string());
                }
            }
            return (usb_port, transport_id);
        }
    }
    (None, None)
}

/// Spawns the low-overhead, independently scheduled telemetry probe worker using Instant deadlines.
pub(crate) fn start_telemetry_worker(tracker: Arc<SessionTracker>, adb_path: String) {
    thread::spawn(move || {
        let adb = Path::new(&adb_path);
        let serial = &tracker.device_serial;

        let mut next_latency = Instant::now();
        let mut next_thermal = Instant::now();
        let mut next_usb = Instant::now();
        let mut next_sample = Instant::now();
        let mut last_warning_count: u32 = 0;

        while !tracker.stop_signal.load(Ordering::Relaxed) {
            thread::sleep(Duration::from_millis(100));
            if tracker.stop_signal.load(Ordering::Relaxed) {
                break;
            }
            let now = Instant::now();

            // ── 1. ADB Command Latency (Every 2 seconds) ────────────────────────
            if now >= next_latency {
                next_latency = now + Duration::from_secs(2);
                let mut cmd = Command::new(adb);
                cmd.args(["-s", serial, "shell", "true"]);
                let (current_latency_status, _, elapsed) =
                    run_command_with_timeout(cmd, Duration::from_millis(1500));

                let current_latency_ms = if current_latency_status == ProbeStatus::Ok {
                    if let Some(dur) = elapsed {
                        let ms = dur.as_millis().min(9999) as u32;
                        let mut baseline_guard = tracker
                            .latency_baseline_ms
                            .lock()
                            .unwrap_or_else(|e| e.into_inner());
                        if baseline_guard.is_none() {
                            *baseline_guard = Some(ms);
                        }
                        Some(ms)
                    } else {
                        None
                    }
                } else {
                    None
                };

                if let Ok(mut transport) = tracker.latest_transport.lock() {
                    transport.adb_command_latency_ms = current_latency_ms;
                    transport.adb_latency_status = current_latency_status;
                    transport.latency_baseline_ms = *tracker
                        .latency_baseline_ms
                        .lock()
                        .unwrap_or_else(|e| e.into_inner());
                }
            }

            // ── 2. Battery & Thermal Status (Every 4 seconds) ───────────────────
            if now >= next_thermal {
                next_thermal = now + Duration::from_secs(4);
                let mut battery_cmd = Command::new(adb);
                battery_cmd.args(["-s", serial, "shell", "dumpsys", "battery"]);
                let (b_status, b_out, _) =
                    run_command_with_timeout(battery_cmd, Duration::from_millis(2500));

                let mut thermal_cmd = Command::new(adb);
                thermal_cmd.args(["-s", serial, "shell", "dumpsys", "thermalservice"]);
                let (t_status, t_out, _) =
                    run_command_with_timeout(thermal_cmd, Duration::from_millis(2500));

                let parsed_temp = b_out.as_deref().and_then(parse_battery_temp);
                let parsed_thermal = t_out.as_deref().and_then(parse_thermal_status);

                if let Ok(mut device) = tracker.latest_device.lock() {
                    device.battery_temp_c = parsed_temp;
                    device.battery_temp_status = if parsed_temp.is_some() {
                        ProbeStatus::Ok
                    } else {
                        b_status
                    };
                    device.thermal_status = parsed_thermal.clone();
                    device.thermal_status_status = if parsed_thermal.is_some() {
                        ProbeStatus::Ok
                    } else {
                        t_status
                    };
                }
            }

            // ── 3. USB Link Speed & Transport ID (Every 10 seconds) ────────────
            if now >= next_usb {
                next_usb = now + Duration::from_secs(10);
                let mut dev_cmd = Command::new(adb);
                dev_cmd.args(["devices", "-l"]);
                let (d_status, d_out, _) =
                    run_command_with_timeout(dev_cmd, Duration::from_millis(2000));

                if d_status == ProbeStatus::Ok {
                    if let Some(out) = d_out {
                        let (usb_port, transport_id) = parse_device_transport_info(&out, serial);

                        if let Some(ref tid) = transport_id {
                            let mut last_tid_guard = tracker
                                .last_transport_id
                                .lock()
                                .unwrap_or_else(|e| e.into_inner());
                            if let Some(ref prev) = *last_tid_guard {
                                if prev != tid {
                                    let mut count_guard = tracker
                                        .reconnect_count
                                        .lock()
                                        .unwrap_or_else(|e| e.into_inner());
                                    *count_guard = count_guard.saturating_add(1);
                                }
                            }
                            *last_tid_guard = Some(tid.clone());
                        }

                        let (usb_speed_status, usb_speed) = if let Some(ref port) = usb_port {
                            read_linux_usb_speed(port)
                        } else {
                            (ProbeStatus::Unavailable, None)
                        };

                        if let Ok(mut transport) = tracker.latest_transport.lock() {
                            transport.usb_path = usb_port;
                            transport.transport_id = transport_id;
                            transport.usb_speed_mbps = usb_speed;
                            transport.usb_speed_status = usb_speed_status;
                            transport.reconnect_count = *tracker
                                .reconnect_count
                                .lock()
                                .unwrap_or_else(|e| e.into_inner());
                        }
                    }
                }
            }

            // ── 4. Record Session Sample & Update All Collecting Bookmarks ─────
            if now >= next_sample {
                next_sample = now + Duration::from_secs(2);
                let dev_snapshot = tracker
                    .latest_device
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .clone();
                let trans_snapshot = tracker
                    .latest_transport
                    .lock()
                    .unwrap_or_else(|e| e.into_inner())
                    .clone();

                let (current_fps, current_warnings) = if let Ok(t) = tracker.scrcpy_telemetry.lock()
                {
                    (t.fps, t.warning_count)
                } else {
                    (None, 0)
                };

                let warnings_since = current_warnings.saturating_sub(last_warning_count);
                last_warning_count = current_warnings;

                let sample = SessionSample {
                    elapsed_ms: tracker.elapsed_ms(),
                    adb_command_latency_ms: trans_snapshot.adb_command_latency_ms,
                    adb_latency_status: trans_snapshot.adb_latency_status,
                    capture_fps: current_fps,
                    battery_temp_c: dev_snapshot.battery_temp_c,
                    battery_temp_status: dev_snapshot.battery_temp_status,
                    thermal_status: dev_snapshot.thermal_status,
                    thermal_status_status: dev_snapshot.thermal_status_status,
                    usb_speed_mbps: trans_snapshot.usb_speed_mbps,
                    usb_speed_status: trans_snapshot.usb_speed_status,
                    warnings_since_last_sample: warnings_since,
                    is_stutter_mark: false,
                };

                // Push to rolling samples (capacity 180)
                let mut samples_guard = tracker.samples.lock().unwrap_or_else(|e| e.into_inner());
                if samples_guard.len() >= 180 {
                    samples_guard.pop_front();
                }
                samples_guard.push_back(sample.clone());

                // Update ALL collecting bookmarks for their +30s window simultaneously
                let mut bookmarks_guard =
                    tracker.bookmarks.lock().unwrap_or_else(|e| e.into_inner());
                for b in bookmarks_guard.iter_mut() {
                    if b.state == BookmarkState::Collecting {
                        b.window_samples.push(sample.clone());
                        if sample.elapsed_ms >= b.elapsed_ms.saturating_add(30_000) {
                            b.state = BookmarkState::Complete;
                        }
                    }
                }
            }
        }
    });
}

// ── Mark Stutter Core Logic ───────────────────────────────────────────────────

pub(crate) fn mark_stutter_internal(
    tracker: &SessionTracker,
    app: Option<&tauri::AppHandle>,
) -> Result<StutterBookmark, String> {
    let now_elapsed = tracker.elapsed_ms();
    let bookmark_id = format!("mark_{}", now_elapsed);
    let sixty_sec_prior = now_elapsed.saturating_sub(60_000);

    // Tag latest sample so timeline reflects mark position
    if let Ok(mut samples_guard) = tracker.samples.lock() {
        if let Some(last) = samples_guard.back_mut() {
            last.is_stutter_mark = true;
        }
    }

    // Filter samples from -60s up to now
    let window_samples: Vec<SessionSample> = {
        let samples_guard = tracker.samples.lock().map_err(|e| e.to_string())?;
        samples_guard
            .iter()
            .filter(|s| s.elapsed_ms >= sixty_sec_prior)
            .cloned()
            .collect()
    };

    let dev = tracker
        .latest_device
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    let trans = tracker
        .latest_transport
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    // Pull real FPS and recent warnings from shared scrcpy telemetry
    let (fps_at_mark, recent_warnings) = if let Ok(t) = tracker.scrcpy_telemetry.lock() {
        let warnings: Vec<String> = t
            .logs
            .iter()
            .rev()
            .filter(|l| l.level == ScrcpyLogLevel::Warn || l.level == ScrcpyLogLevel::Error)
            .take(20)
            .map(|l| format!("[{}ms] {}", l.elapsed_ms, l.message))
            .collect();
        (t.fps, warnings)
    } else {
        (None, Vec::new())
    };

    let bookmark = StutterBookmark {
        id: bookmark_id,
        elapsed_ms: now_elapsed,
        time_utc: now_utc_iso(),
        state: BookmarkState::Collecting,
        latency_at_mark_ms: trans.adb_command_latency_ms,
        baseline_latency_ms: trans.latency_baseline_ms,
        fps_at_mark,
        temp_at_mark_c: dev.battery_temp_c,
        thermal_status: dev.thermal_status,
        usb_speed_mbps: trans.usb_speed_mbps,
        window_samples,
        recent_warnings,
    };

    let mut bookmarks = tracker.bookmarks.lock().map_err(|e| e.to_string())?;
    if bookmarks.len() >= 20 {
        bookmarks.remove(0);
    }
    bookmarks.push(bookmark.clone());

    if let Some(app) = app {
        let _ = app.emit("stutter-marked", &bookmark);
    }

    Ok(bookmark)
}

// ── IPC Socket Listener for Global Shortcuts ─────────────────────────────────

pub(crate) fn start_ipc_listener(
    app: tauri::AppHandle,
    state: Arc<Mutex<Option<Arc<SessionTracker>>>>,
) {
    #[cfg(unix)]
    {
        let sock_path = std::env::var("XDG_RUNTIME_DIR")
            .map(|d| format!("{d}/aether-relay-ipc.sock"))
            .unwrap_or_else(|_| "/tmp/aether-relay-ipc.sock".to_string());
        let _ = fs::remove_file(&sock_path);
        if let Ok(listener) = std::os::unix::net::UnixListener::bind(&sock_path) {
            thread::spawn(move || {
                use std::io::{BufRead, BufReader, Write};
                for mut stream in listener.incoming().flatten() {
                    let mut line = String::new();
                    let mut reader = BufReader::new(&stream);
                    if reader.read_line(&mut line).is_ok() && line.trim() == "MARK_STUTTER" {
                        let res = {
                            let guard = state.lock().unwrap_or_else(|e| e.into_inner());
                            if let Some(ref tracker) = *guard {
                                mark_stutter_internal(tracker, Some(&app))
                            } else {
                                Err("No active session running".into())
                            }
                        };
                        let resp = match res {
                            Ok(bm) => format!("OK: Stutter marked at {}ms\n", bm.elapsed_ms),
                            Err(e) => format!("ERR: {e}\n"),
                        };
                        let _ = stream.write_all(resp.as_bytes());
                    }
                }
            });
        }
    }

    #[cfg(not(unix))]
    {
        if let Ok(listener) = std::net::TcpListener::bind("127.0.0.1:42427") {
            thread::spawn(move || {
                use std::io::{BufRead, BufReader, Write};
                for mut stream in listener.incoming().flatten() {
                    let mut line = String::new();
                    let mut reader = BufReader::new(&stream);
                    if reader.read_line(&mut line).is_ok() && line.trim() == "MARK_STUTTER" {
                        let res = {
                            let guard = state.lock().unwrap_or_else(|e| e.into_inner());
                            if let Some(ref tracker) = *guard {
                                mark_stutter_internal(tracker, Some(&app))
                            } else {
                                Err("No active session running".into())
                            }
                        };
                        let resp = match res {
                            Ok(bm) => format!("OK: Stutter marked at {}ms\n", bm.elapsed_ms),
                            Err(e) => format!("ERR: {e}\n"),
                        };
                        let _ = stream.write_all(resp.as_bytes());
                    }
                }
            });
        }
    }
}

// ── Tauri Commands ────────────────────────────────────────────────────────────

pub(crate) fn get_session_diagnostics_internal(tracker: &SessionTracker) -> SessionDiagnostics {
    let dev = tracker
        .latest_device
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let trans = tracker
        .latest_transport
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();
    let pipe = tracker
        .pipeline
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .clone();

    let meta = SessionMetadata {
        session_id: tracker.session_id.clone(),
        started_at_ms: tracker.started_at_ms,
        started_at_utc: tracker.started_at_utc.clone(),
        ended_at_ms: *tracker
            .ended_at_ms
            .lock()
            .unwrap_or_else(|e| e.into_inner()),
        exit_reason: tracker
            .exit_reason
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone(),
        device_serial: tracker.device_serial.clone(),
        scrcpy_version: tracker
            .scrcpy_version
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .clone(),
        pipeline: pipe,
    };

    let (fps, warnings, drops) = if let Ok(t) = tracker.scrcpy_telemetry.lock() {
        (t.fps, t.warning_count, t.observed_dropped_frames)
    } else {
        (None, 0, None)
    };

    let scrcpy_diag = ScrcpyDiagnostics {
        capture_fps: fps,
        warning_count: warnings,
        observed_dropped_frames: drops,
        session_duration_ms: tracker.elapsed_ms(),
    };

    SessionDiagnostics {
        metadata: meta,
        device: dev,
        transport: trans,
        scrcpy: scrcpy_diag,
    }
}

#[tauri::command]
pub(crate) fn get_session_diagnostics(
    diagnostics: State<'_, DiagnosticsState>,
) -> Result<Option<SessionDiagnostics>, String> {
    let guard = diagnostics.0.lock().map_err(|e| e.to_string())?;
    let Some(ref tracker) = *guard else {
        return Ok(None);
    };
    Ok(Some(get_session_diagnostics_internal(tracker)))
}

#[tauri::command]
pub(crate) fn get_session_samples(
    limit: Option<usize>,
    diagnostics: State<'_, DiagnosticsState>,
) -> Result<Vec<SessionSample>, String> {
    let guard = diagnostics.0.lock().map_err(|e| e.to_string())?;
    let Some(ref tracker) = *guard else {
        return Ok(Vec::new());
    };

    let samples = tracker.samples.lock().map_err(|e| e.to_string())?;
    let take_count = limit.unwrap_or(samples.len()).min(samples.len());
    let skip_count = samples.len().saturating_sub(take_count);
    Ok(samples.iter().skip(skip_count).cloned().collect())
}

#[tauri::command]
pub(crate) fn mark_stutter(
    diagnostics: State<'_, DiagnosticsState>,
    app: tauri::AppHandle,
) -> Result<Option<StutterBookmark>, String> {
    let guard = diagnostics.0.lock().map_err(|e| e.to_string())?;
    let Some(ref tracker) = *guard else {
        return Ok(None);
    };

    mark_stutter_internal(tracker, Some(&app)).map(Some)
}

#[tauri::command]
pub(crate) fn get_stutter_bookmarks(
    diagnostics: State<'_, DiagnosticsState>,
) -> Result<Vec<StutterBookmark>, String> {
    let guard = diagnostics.0.lock().map_err(|e| e.to_string())?;
    let Some(ref tracker) = *guard else {
        return Ok(Vec::new());
    };
    let bookmarks = tracker.bookmarks.lock().map_err(|e| e.to_string())?;
    Ok(bookmarks.clone())
}

#[tauri::command]
pub(crate) fn export_diagnostics_json(
    diagnostics: State<'_, DiagnosticsState>,
    logs: Vec<ScrcpyLogEntry>,
) -> Result<String, String> {
    let guard = diagnostics.0.lock().map_err(|e| e.to_string())?;
    let Some(ref tracker) = *guard else {
        return Err("No active diagnostic session to export".into());
    };

    let dev = tracker
        .latest_device
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    let trans = tracker
        .latest_transport
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    let pipe = tracker.pipeline.lock().map_err(|e| e.to_string())?.clone();

    let meta = SessionMetadata {
        session_id: tracker.session_id.clone(),
        started_at_ms: tracker.started_at_ms,
        started_at_utc: tracker.started_at_utc.clone(),
        ended_at_ms: *tracker.ended_at_ms.lock().map_err(|e| e.to_string())?,
        exit_reason: tracker
            .exit_reason
            .lock()
            .map_err(|e| e.to_string())?
            .clone(),
        device_serial: tracker.device_serial.clone(),
        scrcpy_version: tracker
            .scrcpy_version
            .lock()
            .map_err(|e| e.to_string())?
            .clone(),
        pipeline: pipe,
    };

    let (fps, warnings, drops, full_logs) = if let Ok(t) = tracker.scrcpy_telemetry.lock() {
        let in_memory_logs: Vec<ScrcpyLogEntry> = t.logs.iter().cloned().collect();
        let logs_to_use = if in_memory_logs.len() >= logs.len() {
            in_memory_logs
        } else {
            logs
        };
        (
            t.fps,
            t.warning_count,
            t.observed_dropped_frames,
            logs_to_use,
        )
    } else {
        (None, 0, None, logs)
    };

    let summary = SessionDiagnostics {
        metadata: meta.clone(),
        device: dev,
        transport: trans,
        scrcpy: ScrcpyDiagnostics {
            capture_fps: fps,
            warning_count: warnings,
            observed_dropped_frames: drops,
            session_duration_ms: tracker.elapsed_ms(),
        },
    };

    let samples = tracker
        .samples
        .lock()
        .map_err(|e| e.to_string())?
        .iter()
        .cloned()
        .collect();

    let bookmarks = tracker.bookmarks.lock().map_err(|e| e.to_string())?.clone();

    let export = DiagnosticsExport {
        schema_version: 1,
        exported_at_utc: now_utc_iso(),
        metadata: meta,
        summary,
        samples,
        bookmarks,
        recent_logs: full_logs,
    };

    let raw_json = serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?;
    Ok(redact_string(&raw_json, &tracker.device_serial))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_battery_temp_works() {
        let output = "Current Battery Service state:\n  temperature: 385\n  level: 80";
        assert_eq!(parse_battery_temp(output), Some(38.5));
    }

    #[test]
    fn parse_thermal_status_works() {
        let output = "ThermalEventListeners:\nThermal Status: 2\nCached temperatures:";
        assert_eq!(parse_thermal_status(output), Some(ThermalStatus::Moderate));

        let output_none = "Thermal Status: 0\n";
        assert_eq!(parse_thermal_status(output_none), Some(ThermalStatus::None));
    }

    #[test]
    fn parse_device_transport_info_works() {
        let output = "List of devices attached\nATEHBB5516900383       device usb:3-1 product:ALT-NX3 transport_id:6\n";
        let (usb, tid) = parse_device_transport_info(output, "ATEHBB5516900383");
        assert_eq!(usb, Some("3-1".to_string()));
        assert_eq!(tid, Some("6".to_string()));
    }

    #[test]
    fn redact_string_masks_serial() {
        let serial = "ATEHBB5516900383";
        let text = format!("Connecting device {}", serial);
        let redacted = redact_string(&text, serial);
        assert_eq!(redacted, "Connecting device ATE***383");
    }

    #[test]
    fn redact_string_masks_ip_addresses() {
        let text = "Device connected over 192.168.1.120:5555 on port 5555";
        let redacted = redact_string(text, "ATEHBB5516900383");
        assert!(!redacted.contains("192.168.1.120"));
        assert!(redacted.contains("192.168.***.***"));
    }

    #[test]
    fn multiple_concurrent_collecting_bookmarks_complete_independently() {
        let telemetry = Arc::new(Mutex::new(crate::scrcpy::TelemetryInner::default()));
        let tracker = Arc::new(SessionTracker::new("TEST_SERIAL_123".into(), telemetry));

        // Create sample 1
        let s1 = SessionSample {
            elapsed_ms: 10_000,
            adb_command_latency_ms: Some(15),
            adb_latency_status: ProbeStatus::Ok,
            capture_fps: Some(60),
            battery_temp_c: Some(35.0),
            battery_temp_status: ProbeStatus::Ok,
            thermal_status: Some(ThermalStatus::None),
            thermal_status_status: ProbeStatus::Ok,
            usb_speed_mbps: Some(480),
            usb_speed_status: ProbeStatus::Ok,
            warnings_since_last_sample: 0,
            is_stutter_mark: false,
        };
        tracker.samples.lock().unwrap().push_back(s1);

        // Mark bookmark 1 at 10s
        let bm1 = mark_stutter_internal(&tracker, None).unwrap();
        assert_eq!(bm1.state, BookmarkState::Collecting);

        // Advance to 15s and mark bookmark 2
        let s2 = SessionSample {
            elapsed_ms: 15_000,
            adb_command_latency_ms: Some(25),
            adb_latency_status: ProbeStatus::Ok,
            capture_fps: Some(58),
            battery_temp_c: Some(36.0),
            battery_temp_status: ProbeStatus::Ok,
            thermal_status: Some(ThermalStatus::None),
            thermal_status_status: ProbeStatus::Ok,
            usb_speed_mbps: Some(480),
            usb_speed_status: ProbeStatus::Ok,
            warnings_since_last_sample: 1,
            is_stutter_mark: false,
        };
        tracker.samples.lock().unwrap().push_back(s2);

        let bm2 = mark_stutter_internal(&tracker, None).unwrap();
        assert_eq!(bm2.state, BookmarkState::Collecting);

        // Manually adjust the stored bookmarks' elapsed_ms for predictable timing in unit test
        {
            let mut bookmarks = tracker.bookmarks.lock().unwrap();
            bookmarks[0].elapsed_ms = 10_000;
            bookmarks[1].elapsed_ms = 15_000;
        }

        // Feed sample at 41s: bm1 (elapsed ~10s) reached 10s + 30s = 40s -> should complete!
        // bm2 (elapsed ~15s) needs 45s -> still collecting!
        let s3 = SessionSample {
            elapsed_ms: 41_000,
            adb_command_latency_ms: Some(18),
            adb_latency_status: ProbeStatus::Ok,
            capture_fps: Some(60),
            battery_temp_c: Some(36.5),
            battery_temp_status: ProbeStatus::Ok,
            thermal_status: Some(ThermalStatus::None),
            thermal_status_status: ProbeStatus::Ok,
            usb_speed_mbps: Some(480),
            usb_speed_status: ProbeStatus::Ok,
            warnings_since_last_sample: 0,
            is_stutter_mark: false,
        };

        {
            let mut bookmarks = tracker.bookmarks.lock().unwrap();
            for b in bookmarks.iter_mut() {
                if b.state == BookmarkState::Collecting {
                    b.window_samples.push(s3.clone());
                    if s3.elapsed_ms >= b.elapsed_ms.saturating_add(30_000) {
                        b.state = BookmarkState::Complete;
                    }
                }
            }
        }

        let bookmarks = tracker.bookmarks.lock().unwrap();
        assert_eq!(bookmarks[0].state, BookmarkState::Complete);
        assert_eq!(bookmarks[1].state, BookmarkState::Collecting);
    }

    #[test]
    fn shared_telemetry_updates_session_diagnostics_and_samples() {
        let telemetry = Arc::new(Mutex::new(crate::scrcpy::TelemetryInner::default()));
        let tracker = Arc::new(SessionTracker::new(
            "TEST_SERIAL_456".into(),
            telemetry.clone(),
        ));

        // Inject telemetry
        {
            let mut t = telemetry.lock().unwrap();
            t.fps = Some(59);
            t.warning_count = 3;
            t.observed_dropped_frames = Some(2);
        }

        let diag_res = get_session_diagnostics_internal(&tracker);
        assert_eq!(diag_res.scrcpy.capture_fps, Some(59));
        assert_eq!(diag_res.scrcpy.warning_count, 3);
        assert_eq!(diag_res.scrcpy.observed_dropped_frames, Some(2));
    }
}
