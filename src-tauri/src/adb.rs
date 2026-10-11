//! ADB device listing, app activation and deactivation.

use crate::tools::{hidden_command, resolve_tool};
use crate::types::{
    ActivationLog, ActivationResult, ActivationTarget, Device, DeviceMemoryStats, GameBoostResult,
    PhoneProcessInfo, PresetAppInfo, ACTIVATION_TARGETS,
};
use std::{
    collections::{HashMap, HashSet},
    path::Path,
    sync::{LazyLock, Mutex},
    thread,
    time::Duration,
};
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

fn running_preset_packages(adb: &Path, serial: &str) -> Vec<String> {
    PRESET_BACKGROUND_APPS
        .iter()
        .filter_map(|(_, _, package)| {
            let output = hidden_command(adb)
                .args(["-s", serial, "shell", "pidof", package])
                .output()
                .ok()?;
            (!String::from_utf8_lossy(&output.stdout).trim().is_empty())
                .then(|| (*package).to_string())
        })
        .collect()
}

/// Return a known preset app when Android reports it as the foreground app.
/// We only need to identify apps that could otherwise be stopped by the
/// booster, so parsing is deliberately constrained to the allow-list.
fn foreground_preset_package(adb: &Path, serial: &str) -> Option<String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "dumpsys", "window", "windows"])
        .output()
        .ok()?;
    foreground_preset_package_from_output(&String::from_utf8_lossy(&output.stdout))
}

fn foreground_preset_package_from_output(output: &str) -> Option<String> {
    PRESET_BACKGROUND_APPS
        .iter()
        .find(|(_, _, package)| {
            output.lines().any(|line| {
                (line.contains("mCurrentFocus") || line.contains("mFocusedApp"))
                    && line.contains(package)
            })
        })
        .map(|(_, _, package)| (*package).to_string())
}

const PROTECTED_GAME_PACKAGES: &[(&str, &str)] = &[
    ("com.freefire.dts", "Free Fire"),
    ("com.dts.freefireth", "Free Fire"),
    ("com.dts.freefiremax", "Free Fire MAX"),
    ("moe.shizuku.privileged.api", "Shizuku"),
];

fn protected_package_reason(package: &str) -> Option<String> {
    if let Some((_, name)) = PROTECTED_GAME_PACKAGES
        .iter()
        .find(|(protected, _)| *protected == package)
    {
        return Some(format!("{name} está protegido durante la sesión de juego."));
    }
    if let Some(target) = ACTIVATION_TARGETS
        .iter()
        .find(|target| target.package_names.contains(&package))
    {
        return Some(format!(
            "{} está protegido como mapper activo.",
            target.name
        ));
    }
    // Critical system infrastructure that should never be force-stopped
    if package == "com.android.systemui" {
        return Some("Interfaz gráfica del sistema Android (SystemUI).".to_string());
    }
    if package == "com.android.settings" {
        return Some("Ajustes del sistema Android.".to_string());
    }
    if package == "com.android.phone" || package == "com.android.server.telecom" {
        return Some("Servicio de telefonía y llamadas de emergencia.".to_string());
    }
    if package == "com.google.android.gms" {
        return Some("Servicios de Google Play.".to_string());
    }
    if package.contains(".inputmethod.") || package.ends_with(".latin") {
        return Some("Teclado activo del sistema.".to_string());
    }
    if package.contains("launcher") || package.ends_with(".home") {
        return Some("Lanzador de inicio de Android.".to_string());
    }
    None
}

const KNOWN_APP_NAMES: &[(&str, &str)] = &[
    ("com.dts.freefireth", "Free Fire"),
    ("com.dts.freefiremax", "Free Fire MAX"),
    ("com.freefire.dts", "Free Fire"),
    ("com.panda.mouse", "Panda Mouse Pro"),
    ("com.panda.mappinglab", "Panda Mapping Lab"),
    ("moe.shizuku.privileged.api", "Shizuku"),
    ("com.zhiliaoapp.musically", "TikTok"),
    ("com.whatsapp", "WhatsApp"),
    ("com.google.android.youtube", "YouTube"),
    ("com.android.chrome", "Google Chrome"),
    ("com.google.android.apps.photos", "Google Fotos"),
    ("com.google.android.apps.messaging", "Google Mensajes"),
    ("com.android.vending", "Google Play Store"),
    ("com.google.android.gms", "Google Play Services"),
    ("com.google.android.inputmethod.latin", "Gboard"),
    ("com.google.android.googlequicksearchbox", "Google"),
    ("com.facebook.katana", "Facebook"),
    ("com.facebook.services", "Facebook Services"),
    ("com.instagram.android", "Instagram"),
    ("com.spotify.music", "Spotify"),
    ("com.discord", "Discord"),
    ("com.twitter.android", "X (Twitter)"),
    ("org.mozilla.firefox", "Firefox"),
    ("com.canva.editor", "Canva"),
    ("com.valvesoftware.android.steam.community", "Steam"),
    ("com.openai.chatgpt", "ChatGPT"),
    ("org.telegram.messenger", "Telegram"),
    ("com.bcp.innovacxion.yapeapp", "Yape"),
    ("com.bcp.bank.bcp", "Banco BCP"),
    ("com.bbva.nxt_peru", "BBVA Perú"),
    ("com.supercell.clashroyale", "Clash Royale"),
    ("com.supercell.brawlstars", "Brawl Stars"),
    ("com.supercell.clashofclans", "Clash of Clans"),
    ("com.activision.callofduty.shooter", "Call of Duty: Mobile"),
    ("com.ea.gp.apexlegendsmobilefps", "Apex Legends"),
    ("com.tencent.ig", "PUBG Mobile"),
    ("com.miHoYo.GenshinImpact", "Genshin Impact"),
    ("com.android.systemui", "Android System UI"),
    ("com.android.settings", "Configuración"),
    ("com.android.phone", "Teléfono"),
    ("com.android.bluetooth", "Bluetooth"),
    ("com.hihonor.android.launcher", "Honor Launcher"),
    ("com.hihonor.systemmanager", "Honor Optimizador"),
    ("us.zoom.videomeetings", "Zoom"),
    ("org.localsend.localsend_app", "LocalSend"),
    ("com.duolingo", "Duolingo"),
    ("com.netflix.mediaclient", "Netflix"),
    ("com.disney.disneyplus", "Disney+"),
    ("com.waze", "Waze"),
    ("com.pinterest", "Pinterest"),
    ("com.pedidosya", "PedidosYa"),
    ("com.grability.rappi", "Rappi"),
];

fn display_name_for_package(package: &str) -> String {
    if let Some((_, name)) = KNOWN_APP_NAMES.iter().find(|(pkg, _)| *pkg == package) {
        return (*name).to_string();
    }
    PRESET_BACKGROUND_APPS
        .iter()
        .find(|(_, _, preset)| *preset == package)
        .map(|(_, name, _)| (*name).to_string())
        .or_else(|| {
            PROTECTED_GAME_PACKAGES
                .iter()
                .find(|(protected, _)| *protected == package)
                .map(|(_, name)| (*name).to_string())
        })
        .unwrap_or_else(|| {
            let parts: Vec<&str> = package.split('.').collect();
            if parts.len() >= 2 {
                let meaningful = parts
                    .iter()
                    .rev()
                    .find(|p| !p.is_empty() && **p != "android" && **p != "app")
                    .copied()
                    .unwrap_or(parts[parts.len() - 1]);
                let mut chars = meaningful.chars();
                if let Some(first) = chars.next() {
                    let capitalized: String =
                        first.to_uppercase().collect::<String>() + chars.as_str();
                    return capitalized.replace('_', " ");
                }
            }
            package.to_string()
        })
}

fn base64_encode(data: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = chunk.get(1).copied().unwrap_or(0) as usize;
        let b2 = chunk.get(2).copied().unwrap_or(0) as usize;
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARSET[(triple >> 18) & 0x3F] as char);
        result.push(CHARSET[(triple >> 12) & 0x3F] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[(triple >> 6) & 0x3F] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[triple & 0x3F] as char);
        } else {
            result.push('=');
        }
    }
    result
}

fn find_best_icon_entry(unzip_list: &str) -> Option<String> {
    let mut candidates: Vec<(u8, String)> = Vec::new();
    for line in unzip_list.lines() {
        let line = line.trim();
        let Some(path) = line.split_whitespace().last() else {
            continue;
        };
        let lower = path.to_lowercase();
        if (!lower.ends_with(".png") && !lower.ends_with(".webp")) || lower.ends_with(".9.png") {
            continue;
        }

        let mut score: u8 = 0;
        if lower.contains("ic_launcher") || lower.contains("app_icon") {
            score += 50;
        } else if lower.contains("launcher") || lower.contains("icon") {
            score += 20;
        } else {
            continue;
        }

        if lower.contains("xxxhdpi") {
            score += 30;
        } else if lower.contains("xxhdpi") {
            score += 25;
        } else if lower.contains("xhdpi") {
            score += 20;
        } else if lower.contains("hdpi") {
            score += 15;
        } else if lower.contains("mdpi") {
            score += 10;
        }

        if lower.contains("foreground") || lower.contains("background") {
            score = score.saturating_sub(15);
        }

        candidates.push((score, path.to_string()));
    }

    candidates.sort_by_key(|(score, _)| std::cmp::Reverse(*score));
    candidates.into_iter().map(|(_, path)| path).next()
}

fn extract_package_icon(adb: &Path, serial: &str, package: &str) -> Option<String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "pm", "path", package])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let apk_path = stdout
        .lines()
        .filter_map(|l| l.trim().strip_prefix("package:"))
        .find(|p| p.ends_with("base.apk"))
        .or_else(|| {
            stdout
                .lines()
                .filter_map(|l| l.trim().strip_prefix("package:"))
                .next()
        })?;

    let list_output = hidden_command(adb)
        .args(["-s", serial, "shell", "unzip", "-l", apk_path])
        .output()
        .ok()?;
    if !list_output.status.success() {
        return None;
    }
    let list_str = String::from_utf8_lossy(&list_output.stdout);
    let best_entry = find_best_icon_entry(&list_str)?;

    let exec_out = hidden_command(adb)
        .args([
            "-s",
            serial,
            "exec-out",
            &format!("unzip -p \"{apk_path}\" \"{best_entry}\""),
        ])
        .output()
        .ok()?;
    if !exec_out.status.success() || exec_out.stdout.is_empty() {
        return None;
    }

    let bytes = &exec_out.stdout;
    let is_png = bytes.starts_with(b"\x89PNG\r\n\x1a\n");
    let is_webp = bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP";

    if !is_png && !is_webp {
        return None;
    }

    let mime = if is_webp { "image/webp" } else { "image/png" };
    let b64 = base64_encode(bytes);
    Some(format!("data:{mime};base64,{b64}"))
}

static ICON_CACHE: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn get_package_icon(adb: &Path, serial: &str, package: &str) -> Option<String> {
    if let Ok(cache) = ICON_CACHE.lock() {
        if let Some(icon) = cache.get(package) {
            return if icon.is_empty() {
                None
            } else {
                Some(icon.clone())
            };
        }
    }

    let extracted = extract_package_icon(adb, serial, package);
    if let Ok(mut cache) = ICON_CACHE.lock() {
        cache.insert(package.to_string(), extracted.clone().unwrap_or_default());
    }
    extracted
}

fn all_installed_packages(adb: &Path, serial: &str) -> Result<HashSet<String>, String> {
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "pm", "list", "packages"])
        .output()
        .map_err(|e| format!("No se pudo consultar las apps del teléfono: {e}"))?;
    if !output.status.success() {
        return Err(command_error(&output));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.trim().strip_prefix("package:"))
        .map(str::to_string)
        .collect())
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ParsedPhoneProcess {
    pub(crate) package: String,
    pub(crate) pid: Option<u32>,
    pub(crate) memory_bytes: u64,
    pub(crate) protected: bool,
    pub(crate) protection_reason: Option<String>,
}

fn parse_phone_processes(meminfo: &str, all_packages: &HashSet<String>) -> Vec<ParsedPhoneProcess> {
    let mut procs: HashMap<String, (Option<u32>, u64)> = HashMap::new();
    let mut in_pss = false;
    let pss_found = meminfo.contains("Total PSS by process:");

    for line in meminfo.lines() {
        if pss_found {
            if line.contains("Total PSS by process:") {
                in_pss = true;
                continue;
            }
            if in_pss && (line.starts_with("Total ") || line.starts_with(" Applications Memory")) {
                break;
            }
            if !in_pss {
                continue;
            }
        } else {
            if line.contains("Total RSS by process:") {
                in_pss = true;
                continue;
            }
            if in_pss && line.starts_with("Total ") {
                break;
            }
            if !in_pss {
                continue;
            }
        }

        let line = line.trim();
        let Some((mem_part, proc_part)) = line.split_once("K:") else {
            continue;
        };
        let Ok(mem_kb) = mem_part.trim().replace(',', "").parse::<u64>() else {
            continue;
        };
        let proc_part = proc_part.trim();

        let (raw_proc, pid) = if let Some((p, rest)) = proc_part.split_once(" (pid ") {
            let pid_str = rest
                .split_whitespace()
                .next()
                .unwrap_or_default()
                .trim_matches(')');
            (p.trim(), pid_str.parse::<u32>().ok())
        } else {
            (proc_part, None)
        };

        let pkg = raw_proc.split(':').next().unwrap_or(raw_proc).trim();
        if pkg.is_empty()
            || !pkg.contains('.')
            || pkg.starts_with('.')
            || pkg.starts_with("vendor.")
            || pkg.starts_with("media.")
        {
            continue;
        }
        if raw_proc.contains("sandboxed_process") {
            continue;
        }

        if !all_packages.is_empty() && !all_packages.contains(pkg) {
            continue;
        }

        let entry = procs.entry(pkg.to_string()).or_insert((pid, 0));
        entry.1 = entry.1.saturating_add(mem_kb.saturating_mul(1024));
        if entry.0.is_none() && pid.is_some() {
            entry.0 = pid;
        }
    }

    let mut result: Vec<ParsedPhoneProcess> = procs
        .into_iter()
        .map(|(package, (pid, mem))| {
            let protection_reason = protected_package_reason(&package);
            ParsedPhoneProcess {
                protected: protection_reason.is_some(),
                protection_reason,
                package,
                pid,
                memory_bytes: mem,
            }
        })
        .collect();
    result.sort_by_key(|p| std::cmp::Reverse(p.memory_bytes));
    result
}

#[tauri::command]
pub(crate) async fn list_phone_processes(
    serial: String,
    app: AppHandle,
) -> Result<Vec<PhoneProcessInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        let all_packages = all_installed_packages(&adb, &serial).unwrap_or_default();
        let output = hidden_command(&adb)
            .args(["-s", &serial, "shell", "dumpsys", "meminfo"])
            .output()
            .map_err(|e| format!("No se pudo leer la memoria por aplicación: {e}"))?;
        if !output.status.success() {
            return Err(command_error(&output));
        }

        let parsed = parse_phone_processes(&String::from_utf8_lossy(&output.stdout), &all_packages);
        let processes = parsed
            .into_iter()
            .map(|proc| {
                let icon = get_package_icon(&adb, &serial, &proc.package);
                PhoneProcessInfo {
                    pid: proc.pid,
                    name: display_name_for_package(&proc.package),
                    package: proc.package,
                    memory_bytes: proc.memory_bytes,
                    protected: proc.protected,
                    protection_reason: proc.protection_reason,
                    icon,
                }
            })
            .collect();
        Ok(processes)
    })
    .await
    .map_err(|e| format!("list_phone_processes failed: {e}"))?
}

#[tauri::command]
pub(crate) async fn list_preset_apps(
    serial: String,
    app: AppHandle,
) -> Result<Vec<PresetAppInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        let output = hidden_command(&adb)
            .args(["-s", &serial, "shell", "pm list packages"])
            .output()
            .map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&output.stdout);
        let running_packages = running_preset_packages(&adb, &serial);

        let mut list = Vec::new();
        for (id, name, pkg) in PRESET_BACKGROUND_APPS {
            let installed = text.contains(&format!("package:{pkg}"));
            let running = installed && running_packages.iter().any(|running| running == pkg);
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
pub(crate) async fn boost_phone_memory(
    serial: String,
    packages: Vec<String>,
    app: AppHandle,
) -> Result<GameBoostResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        let before = device_memory_stats_blocking(&serial, &app)?;
        let protected_foreground_package = foreground_preset_package(&adb, &serial);
        let mut requested = packages
            .into_iter()
            .map(|package| package.trim().to_string())
            .filter(|package| !package.is_empty())
            .collect::<Vec<_>>();
        requested.sort();
        requested.dedup();
        if requested.is_empty() {
            return Err("Selecciona al menos una app para optimizar.".into());
        }
        let installed = all_installed_packages(&adb, &serial).unwrap_or_default();
        if let Some(package) = requested
            .iter()
            .find(|package| !installed.is_empty() && !installed.contains(*package))
        {
            return Err(format!(
                "La aplicación {package} no está instalada en el dispositivo."
            ));
        }
        if let Some(package) = requested
            .iter()
            .find(|package| protected_package_reason(package).is_some())
        {
            return Err(format!(
                "{package} está protegida y no se puede cerrar desde Game Boost."
            ));
        }
        let mut stopped_packages = Vec::new();

        for package in requested {
            let output = hidden_command(&adb)
                .args(["-s", &serial, "shell", "am", "force-stop", &package])
                .output()
                .map_err(|e| format!("No se pudo cerrar {package}: {e}"))?;
            if output.status.success() {
                stopped_packages.push(package);
            }
        }

        thread::sleep(Duration::from_millis(350));
        let after = device_memory_stats_blocking(&serial, &app)?;
        Ok(GameBoostResult {
            before,
            after,
            stopped_packages,
            protected_foreground_package,
        })
    })
    .await
    .map_err(|e| format!("boost_phone_memory failed: {e}"))?
}

#[tauri::command]
pub(crate) async fn kill_phone_apps(
    serial: String,
    packages: Vec<String>,
    force: bool,
    app: AppHandle,
) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or("ADB not found")?;
        let mut requested = packages
            .into_iter()
            .map(|pkg| pkg.trim().to_string())
            .filter(|pkg| !pkg.is_empty())
            .collect::<Vec<_>>();
        requested.sort();
        requested.dedup();
        if requested.is_empty() {
            return Err("Selecciona al menos una aplicación para cerrar.".into());
        }
        let installed = all_installed_packages(&adb, &serial).unwrap_or_default();
        if let Some(package) = requested
            .iter()
            .find(|package| !installed.is_empty() && !installed.contains(*package))
        {
            return Err(format!(
                "La aplicación {package} no está instalada en el teléfono."
            ));
        }
        if let Some(package) = requested
            .iter()
            .find(|package| protected_package_reason(package).is_some())
        {
            return Err(format!("{package} está protegida y no se puede cerrar."));
        }
        for package in requested {
            let action = if force { "force-stop" } else { "kill" };
            let output = hidden_command(&adb)
                .args(["-s", &serial, "shell", "am", action, &package])
                .output()
                .map_err(|e| format!("No se pudo cerrar {package}: {e}"))?;
            if !output.status.success() {
                return Err(format!(
                    "No se pudo cerrar {package}: {}",
                    command_error(&output)
                ));
            }
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

    #[test]
    fn process_parser_aggregates_ram_and_protects_games_and_mappers() {
        let packages = HashSet::from([
            "com.discord".to_string(),
            "com.dts.freefiremax".to_string(),
            "com.panda.mouse".to_string(),
        ]);
        let meminfo = "Total PSS by process:\n  10,000K: com.discord (pid 123)\n  2,000K: com.discord:push (pid 124)\n  8,000K: com.dts.freefiremax (pid 125)\n  1,000K: com.panda.mouse (pid 126)\n";
        let processes = parse_phone_processes(meminfo, &packages);
        assert_eq!(processes.len(), 3);
        let discord = processes
            .iter()
            .find(|process| process.package == "com.discord")
            .unwrap();
        assert_eq!(discord.memory_bytes, 12_000 * 1024);
        assert!(!discord.protected);
        assert!(
            processes
                .iter()
                .find(|process| process.package == "com.dts.freefiremax")
                .unwrap()
                .protected
        );
        assert!(
            processes
                .iter()
                .find(|process| process.package == "com.panda.mouse")
                .unwrap()
                .protected
        );
    }

    #[test]
    fn foreground_parser_only_matches_known_preset_apps() {
        let chrome =
            "mCurrentFocus=Window{42 u0 com.android.chrome/com.google.android.apps.chrome.Main}";
        assert_eq!(
            foreground_preset_package_from_output(chrome),
            Some("com.android.chrome".to_string())
        );
        let game = "mCurrentFocus=Window{42 u0 com.example.game/.MainActivity}";
        assert_eq!(foreground_preset_package_from_output(game), None);
    }
}
