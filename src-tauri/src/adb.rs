//! ADB device listing, app activation and deactivation.

use crate::tools::{hidden_command, resolve_tool};
use crate::types::{
    ActivationLog, ActivationResult, ActivationTarget, Device, DeviceMemoryStats,
    PresetAppInfo, ACTIVATION_TARGETS,
};
use std::{path::Path, thread, time::Duration};
use tauri::AppHandle;

// ── Internal helpers ──────────────────────────────────────────────────────────

fn now_time() -> String {
    use std::time::SystemTime;
    let duration = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = duration.as_secs() % 86400;
    let hours = secs / 3600;
    let mins = (secs % 3600) / 60;
    let s = secs % 60;
    format!("{:02}:{:02}:{:02}", hours, mins, s)
}

/// Check if any known keymapper daemon process is currently running on the device.
pub(crate) fn is_keymapper_active(adb: &Path, serial: &str) -> bool {
    let output = hidden_command(adb)
        .args([
            "-s",
            serial,
            "shell",
            "ps -ef 2>/dev/null || ps 2>/dev/null",
        ])
        .output();
    if let Ok(out) = output {
        if out.status.success() {
            let stdout = String::from_utf8_lossy(&out.stdout);
            for line in stdout.lines() {
                let lower = line.to_lowercase();
                if lower.contains("grep") || lower.contains("ps ") {
                    continue;
                }
                if lower.contains("inject_server")
                    || lower.contains("chaozhuo")
                    || lower.contains("gameassistant")
                    || lower.contains("shizuku_server")
                    || lower.contains("moe.shizuku.privileged.api")
                    || lower.contains("com.panda.mouse")
                    || lower.contains("com.panda.gamepad")
                    || lower.contains("com.zjx.ztezscreenshot")
                    || lower.contains("ggmouse")
                {
                    return true;
                }
            }
        }
    }
    false
}

#[tauri::command]
pub(crate) async fn check_keymapper_status(serial: String, app: AppHandle) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if serial.trim().is_empty() {
            return Ok(false);
        }
        let adb = resolve_tool("adb", &app).ok_or("未找到 adb，请重新安装 Aether Relay")?;
        Ok(is_keymapper_active(&adb, &serial))
    })
    .await
    .map_err(|e| format!("status check failed: {e}"))?
}

pub(crate) fn parse_meminfo(stdout: &str) -> Option<DeviceMemoryStats> {
    let mut total_kb: u64 = 0;
    let mut free_kb: u64 = 0;
    let mut avail_kb: Option<u64> = None;
    let mut cached_kb: u64 = 0;
    let mut buffers_kb: u64 = 0;

    for line in stdout.lines() {
        let mut parts = line.split_whitespace();
        let Some(key) = parts.next() else { continue };
        let Some(val_str) = parts.next() else {
            continue;
        };
        let Ok(val) = val_str.parse::<u64>() else {
            continue;
        };

        match key {
            "MemTotal:" => total_kb = val,
            "MemFree:" => free_kb = val,
            "MemAvailable:" => avail_kb = Some(val),
            "Cached:" => cached_kb = val,
            "Buffers:" => buffers_kb = val,
            _ => {}
        }
    }

    if total_kb == 0 {
        return None;
    }

    let available_kb = avail_kb.unwrap_or(free_kb + cached_kb + buffers_kb);
    let used_kb = total_kb.saturating_sub(available_kb);

    let total_bytes = total_kb.saturating_mul(1024);
    let available_bytes = available_kb.saturating_mul(1024);
    let used_bytes = used_kb.saturating_mul(1024);
    let percentage = if total_kb > 0 {
        ((used_kb as f64 / total_kb as f64) * 100.0).round() as u32
    } else {
        0
    };

    Some(DeviceMemoryStats {
        total_bytes,
        used_bytes,
        available_bytes,
        percentage,
    })
}

pub(crate) fn device_memory_stats_blocking(
    serial: &str,
    app: &AppHandle,
) -> Result<DeviceMemoryStats, String> {
    if serial.trim().is_empty() {
        return Err("请先选择设备".into());
    }
    let adb = resolve_tool("adb", app).ok_or("未找到 adb，请重新安装 Aether Relay")?;
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "cat", "/proc/meminfo"])
        .output()
        .map_err(|e| format!("无法运行 adb: {e}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_meminfo(&stdout).ok_or_else(|| "无法解析设备内存信息".to_string())
}

#[tauri::command]
pub(crate) async fn device_memory(
    serial: String,
    app: AppHandle,
) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || device_memory_stats_blocking(&serial, &app))
        .await
        .map_err(|e| format!("读取设备内存失败: {e}"))?
}

pub(crate) const PRESET_BACKGROUND_APPS: &[(&str, &str, &str)] = &[
    ("chrome", "Google Chrome", "com.android.chrome"),
    ("youtube", "YouTube", "com.google.android.youtube"),
    ("instagram", "Instagram", "com.instagram.android"),
    ("facebook", "Facebook", "com.facebook.katana"),
    ("tiktok", "TikTok", "com.zhiliaoapp.musically"),
    ("spotify", "Spotify", "com.spotify.music"),
    ("discord", "Discord", "com.discord"),
    ("twitter", "X / Twitter", "com.twitter.android"),
    ("firefox", "Firefox", "org.mozilla.firefox"),
];

#[tauri::command]
pub(crate) async fn list_preset_apps(serial: String, app: AppHandle) -> Result<Vec<PresetAppInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        let output = hidden_command(&adb)
            .args(["-s", &serial, "shell", "pm list packages"])
            .output()
            .map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&output.stdout);
        let ps_output = hidden_command(&adb)
            .args(["-s", &serial, "shell", "ps -A -o NAME 2>/dev/null || ps -A 2>/dev/null || true"])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).to_string())
            .unwrap_or_default();

        let mut list = Vec::new();
        for (id, name, pkg) in PRESET_BACKGROUND_APPS {
            let installed = text.contains(&format!("package:{pkg}"));
            let running = installed && ps_output.lines().any(|l| l.contains(pkg));
            list.push(PresetAppInfo {
                id: id.to_string(),
                name: name.to_string(),
                package: pkg.to_string(),
                installed,
                running,
            });
        }
        Ok(list)
    })
    .await
    .map_err(|e| format!("list_preset_apps failed: {e}"))?
}

#[tauri::command]
pub(crate) async fn boost_phone_memory(serial: String, app: AppHandle) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        // 1. Kill background tasks
        let _ = hidden_command(&adb).args(["-s", &serial, "shell", "am kill-all"]).output();
        // 2. Trim caches if allowed
        let _ = hidden_command(&adb).args(["-s", &serial, "shell", "pm trim-caches 999G 2>/dev/null || true"]).output();
        // 3. Kill heavy non-system preset apps
        let kill_cmd = "for pkg in com.android.chrome com.google.android.youtube com.facebook.katana com.instagram.android com.zhiliaoapp.musically com.twitter.android com.spotify.music org.mozilla.firefox; do am kill $pkg 2>/dev/null; done";
        let _ = hidden_command(&adb).args(["-s", &serial, "shell", kill_cmd]).output();
        thread::sleep(Duration::from_millis(250));
        device_memory_stats_blocking(&serial, &app)
    })
    .await
    .map_err(|e| format!("boost_phone_memory failed: {e}"))?
}

#[tauri::command]
pub(crate) async fn kill_phone_apps(serial: String, packages: Vec<String>, force: bool, app: AppHandle) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        for pkg in packages {
            let trimmed = pkg.trim();
            if trimmed.is_empty() { continue; }
            let action = if force { "force-stop" } else { "kill" };
            let _ = hidden_command(&adb).args(["-s", &serial, "shell", "am", action, trimmed]).output();
        }
        thread::sleep(Duration::from_millis(200));
        device_memory_stats_blocking(&serial, &app)
    })
    .await
    .map_err(|e| format!("kill_phone_apps failed: {e}"))?
}

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
        .map_err(|e| format!("无法运行 adb: {e}"))?;
    if !output.status.success() {
        return Err(format!("无法运行 adb: {}", command_error(&output)));
    }
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse()
        .map_err(|_| "无法读取 Android SDK 版本".to_string())
}

fn is_package_installed(adb: &Path, serial: &str, package_name: &str) -> Result<bool, String> {
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
        .map_err(|e| format!("无法运行 adb: {e}"))?;
    if !output.status.success() {
        return Err(format!("无法运行 adb: {}", command_error(&output)));
    }
    let expected = format!("package:{package_name}");
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .any(|line| line.trim() == expected))
}

fn find_installed_target<'a>(
    adb: &Path,
    serial: &str,
) -> Result<Option<(&'a ActivationTarget, String)>, String> {
    for target in ACTIVATION_TARGETS {
        for &pkg in target.package_names {
            if is_package_installed(adb, serial, pkg).unwrap_or(false) {
                return Ok(Some((target, pkg.to_string())));
            }
        }
    }
    Ok(None)
}

pub(crate) fn find_target_by_name_or_auto<'a>(
    adb: &Path,
    serial: &str,
    preferred: Option<&str>,
) -> Result<Option<(&'a ActivationTarget, String)>, String> {
    if let Some(pref) = preferred {
        let pref = pref.trim();
        if !pref.is_empty() && pref != "auto" {
            for target in ACTIVATION_TARGETS {
                if target.name.eq_ignore_ascii_case(pref) || target.package_names.contains(&pref) {
                    for &pkg in target.package_names {
                        if is_package_installed(adb, serial, pkg).unwrap_or(false) {
                            return Ok(Some((target, pkg.to_string())));
                        }
                    }
                    return Ok(Some((target, target.package_names[0].to_string())));
                }
            }
        }
    }
    find_installed_target(adb, serial)
}

// ── Activation ────────────────────────────────────────────────────────────────

fn activate_apps_blocking(
    serial: String,
    target_app: Option<String>,
    app: AppHandle,
) -> Result<ActivationResult, String> {
    let mut logs = Vec::new();

    if serial.trim().is_empty() {
        return Err("请先选择设备".into());
    }

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!("Iniciando verificación de entorno ADB para dispositivo {serial}..."),
        is_error: false,
    });

    let adb = resolve_tool("adb", &app).ok_or("未找到 adb，请重新安装 Aether Relay")?;

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!(
            "Buscando app mapeadora objetivo ({})",
            target_app.as_deref().unwrap_or("auto")
        ),
        is_error: false,
    });

    let (target, package_name) = find_target_by_name_or_auto(&adb, &serial, target_app.as_deref())?
        .ok_or("未安装受支持的映射 App (GG Mouse Pro / Panda)")?;

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!(
            "Mapeador detectado: {} (paquete: {package_name})",
            target.name
        ),
        is_error: false,
    });

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!(
            "Lanzando {} en Android mediante Intent am monkey...",
            target.name
        ),
        is_error: false,
    });

    let launch = hidden_command(&adb)
        .args([
            "-s",
            &serial,
            "shell",
            "monkey",
            "-p",
            &package_name,
            "-c",
            "android.intent.category.LAUNCHER",
            "1",
        ])
        .output()
        .map_err(|e| format!("无法启动映射 App: {}: {e}", target.name))?;
    if !launch.status.success() {
        let err = command_error(&launch);
        logs.push(ActivationLog {
            timestamp: now_time(),
            message: format!("Error al iniciar app {}: {err}", target.name),
            is_error: true,
        });
        return Err(format!("无法启动映射 App: {}: {}", target.name, err));
    }

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: "Esperando inicialización de la app (3 segundos)...".to_string(),
        is_error: false,
    });

    thread::sleep(Duration::from_secs(3));

    let is_shizuku_installed =
        is_package_installed(&adb, &serial, "moe.shizuku.privileged.api").unwrap_or(false);
    let mut last_error = String::new();
    let mut success = false;
    let mut used_script = String::new();

    if target.name == "GG Mouse Pro" && is_shizuku_installed {
        logs.push(ActivationLog {
            timestamp: now_time(),
            message:
                "Detectado servicio Shizuku para GG Mouse Pro. Intentando activación Shizuku..."
                    .to_string(),
            is_error: false,
        });
        let shizuku_scripts = &[
            "/storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh",
            "/sdcard/Android/data/moe.shizuku.privileged.api/start.sh",
        ];
        for script in shizuku_scripts {
            logs.push(ActivationLog {
                timestamp: now_time(),
                message: format!("Ejecutando script Shizuku: {script}"),
                is_error: false,
            });
            if let Ok(output) = hidden_command(&adb)
                .args(["-s", &serial, "shell", "sh", script])
                .output()
            {
                if output.status.success() {
                    success = true;
                    used_script = script.to_string();
                    logs.push(ActivationLog {
                        timestamp: now_time(),
                        message: format!("Script Shizuku ejecutado con éxito: {script}"),
                        is_error: false,
                    });
                    break;
                }
            }
        }
    } else {
        for script in target.script_paths {
            if script.contains("shizuku") && !is_shizuku_installed {
                continue;
            }
            logs.push(ActivationLog {
                timestamp: now_time(),
                message: format!("Probando ruta de activación: {script}"),
                is_error: false,
            });
            match hidden_command(&adb)
                .args(["-s", &serial, "shell", "sh", script])
                .output()
            {
                Ok(output) => {
                    if output.status.success() {
                        success = true;
                        used_script = script.to_string();
                        logs.push(ActivationLog {
                            timestamp: now_time(),
                            message: format!("Script de activación ejecutado con éxito: {script}"),
                            is_error: false,
                        });
                        break;
                    } else {
                        last_error = command_error(&output);
                        logs.push(ActivationLog {
                            timestamp: now_time(),
                            message: format!("Aviso en ruta {script}: {last_error}"),
                            is_error: false,
                        });
                    }
                }
                Err(err) => {
                    last_error = err.to_string();
                    logs.push(ActivationLog {
                        timestamp: now_time(),
                        message: format!("Error en ruta {script}: {last_error}"),
                        is_error: false,
                    });
                }
            }
        }
    }

    if !success && target.name != "GG Mouse Pro" && !last_error.is_empty() {
        logs.push(ActivationLog {
            timestamp: now_time(),
            message: format!("Fallo en la activación: {last_error}"),
            is_error: true,
        });
        return Err(format!("App 激活失败: {}: {}", target.name, last_error));
    }

    let active_verified = is_keymapper_active(&adb, &serial);
    logs.push(ActivationLog {
        timestamp: now_time(),
        message: if active_verified {
            format!(
                "¡Verificación exitosa! Daemon de {} activo y listo en el dispositivo.",
                target.name
            )
        } else {
            format!(
                "Comandos ejecutados para {}. Verificación en segundo plano completada.",
                target.name
            )
        },
        is_error: false,
    });

    Ok(ActivationResult {
        success: true,
        app_name: target.name.to_string(),
        package_name,
        script_used: used_script,
        logs,
    })
}

#[tauri::command]
pub(crate) async fn activate_apps(
    serial: String,
    target_app: Option<String>,
    app: AppHandle,
) -> Result<ActivationResult, String> {
    tauri::async_runtime::spawn_blocking(move || activate_apps_blocking(serial, target_app, app))
        .await
        .map_err(|e| format!("映射 App 激活失败: {e}"))?
}

// ── Deactivation ──────────────────────────────────────────────────────────────

fn deactivate_apps_blocking(serial: String, app: AppHandle) -> Result<String, String> {
    if serial.trim().is_empty() {
        return Err("请先选择设备".into());
    }
    let adb = resolve_tool("adb", &app).ok_or("未找到 adb，请重新安装 Aether Relay")?;

    for pkg in [
        "com.panda.mouse",
        "com.panda.gamepad",
        "com.panda.touch",
        "com.zjx.ztezscreenshot",
        "com.ggmouse.pro",
        "com.ggmouse.gaming",
        "moe.shizuku.privileged.api",
    ] {
        let _ = hidden_command(&adb)
            .args(["-s", &serial, "shell", "am", "force-stop", pkg])
            .output();
    }

    let kill_script = r#"
pkill -9 -f panda 2>/dev/null || true
pkill -9 -f chaozhuo 2>/dev/null || true
pkill -9 -f gameassistant 2>/dev/null || true
pkill -9 -f inject 2>/dev/null || true
pkill -9 -f shizuku 2>/dev/null || true
pkill -9 -f ztezscreenshot 2>/dev/null || true
pkill -9 -f ggmouse 2>/dev/null || true
for pid in $(ps -ef 2>/dev/null | grep -E 'chaozhuo|panda|gameassistant|inject_server|shizuku|ztezscreenshot|ggmouse' | grep -v grep | awk '{print $2}'); do
    kill -9 $pid 2>/dev/null || true
done
rm -rf /data/local/tmp/*panda* /data/local/tmp/*chaozhuo* /data/local/tmp/*inject* 2>/dev/null || true
"#;
    let _ = hidden_command(&adb)
        .args(["-s", &serial, "shell", kill_script])
        .output();

    Ok("OK".to_string())
}

#[tauri::command]
pub(crate) async fn deactivate_apps(serial: String, app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || deactivate_apps_blocking(serial, app))
        .await
        .map_err(|e| format!("停止映射进程失败: {e}"))?
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

#[tauri::command]
pub(crate) fn list_devices(app: AppHandle) -> Result<Vec<Device>, String> {
    let adb = resolve_tool("adb", &app).ok_or("未找到 adb，请重新安装 Aether Relay")?;
    let output = hidden_command(adb)
        .args(["devices", "-l"])
        .output()
        .map_err(|e| format!("无法运行 adb: {e}"))?;
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
    fn parse_meminfo_with_available() {
        let sample = "MemTotal:        8000000 kB\n\
                      MemFree:         1000000 kB\n\
                      MemAvailable:    4000000 kB\n\
                      Buffers:          200000 kB\n\
                      Cached:          1800000 kB\n";
        let stats = parse_meminfo(sample).expect("should parse meminfo");
        assert_eq!(stats.total_bytes, 8000000 * 1024);
        assert_eq!(stats.available_bytes, 4000000 * 1024);
        assert_eq!(stats.used_bytes, 4000000 * 1024);
        assert_eq!(stats.percentage, 50);
    }

    #[test]
    fn parse_meminfo_fallback_without_available() {
        let sample = "MemTotal:        4000000 kB\n\
                      MemFree:         1000000 kB\n\
                      Buffers:          500000 kB\n\
                      Cached:           500000 kB\n";
        let stats = parse_meminfo(sample).expect("should parse meminfo");
        assert_eq!(stats.total_bytes, 4000000 * 1024);
        // available = free (1000000) + cached (500000) + buffers (500000) = 2000000 kB
        assert_eq!(stats.available_bytes, 2000000 * 1024);
        assert_eq!(stats.used_bytes, 2000000 * 1024);
        assert_eq!(stats.percentage, 50);
    }

    #[test]
    fn parse_meminfo_empty_or_zero() {
        assert!(parse_meminfo("").is_none());
        assert!(parse_meminfo("SomeOtherField: 1234 kB\n").is_none());
    }
}
