//! Phone memory and process management: RAM stats, heavy-app detection,
//! per-app memory, and safe force-stop of background apps.

use crate::device::{all_installed_packages, command_error, foreground_package};
use crate::errors;
use crate::keymapper::ACTIVATION_TARGETS;
use crate::tools::{hidden_command, resolve_tool};
use crate::types::{DeviceMemoryStats, GameBoostResult, PhoneProcessInfo, PresetAppInfo};
use std::{
    collections::{HashMap, HashSet},
    path::Path,
    sync::{LazyLock, Mutex},
    thread,
    time::Duration,
};
use tauri::AppHandle;

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
        return Err(errors::NO_DEVICE.into());
    }
    let adb = resolve_tool("adb", app).ok_or(errors::ADB_MISSING)?;
    let output = hidden_command(adb)
        .args(["-s", serial, "shell", "cat", "/proc/meminfo"])
        .output()
        .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    parse_meminfo(&stdout).ok_or_else(|| errors::detail(errors::ADB_FAILED, "/proc/meminfo"))
}

#[tauri::command]
pub(crate) async fn device_memory(
    serial: String,
    app: AppHandle,
) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || device_memory_stats_blocking(&serial, &app))
        .await
        .map_err(|e| errors::detail(errors::INTERNAL, e))?
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
        let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
        let all_packages = all_installed_packages(&adb, &serial).unwrap_or_default();
        let output = hidden_command(&adb)
            .args(["-s", &serial, "shell", "dumpsys", "meminfo"])
            .output()
            .map_err(|e| errors::detail(errors::ADB_FAILED, e))?;
        if !output.status.success() {
            return Err(command_error(&output));
        }

        let foreground = foreground_package(&adb, &serial);
        let parsed = parse_phone_processes(&String::from_utf8_lossy(&output.stdout), &all_packages);
        let processes = parsed
            .into_iter()
            .map(|proc| {
                let is_foreground = foreground.as_deref() == Some(&proc.package);
                let protection_reason = if is_foreground {
                    Some(
                        proc.protection_reason
                            .unwrap_or_else(|| "Aplicación en primer plano".to_string()),
                    )
                } else {
                    proc.protection_reason
                };
                let protected = proc.protected || is_foreground;
                let icon = get_package_icon(&adb, &serial, &proc.package);
                PhoneProcessInfo {
                    pid: proc.pid,
                    name: display_name_for_package(&proc.package),
                    package: proc.package,
                    memory_bytes: proc.memory_bytes,
                    protected,
                    protection_reason,
                    icon,
                }
            })
            .collect();
        Ok(processes)
    })
    .await
    .map_err(|e| errors::detail(errors::INTERNAL, e))?
}

#[tauri::command]
pub(crate) async fn list_preset_apps(
    serial: String,
    app: AppHandle,
) -> Result<Vec<PresetAppInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
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
    .map_err(|e| errors::detail(errors::INTERNAL, e))?
}

#[tauri::command]
pub(crate) async fn boost_phone_memory(
    serial: String,
    packages: Vec<String>,
    app: AppHandle,
) -> Result<GameBoostResult, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
        let before = device_memory_stats_blocking(&serial, &app)?;
        let protected_foreground_package = foreground_package(&adb, &serial);
        let mut requested = packages
            .into_iter()
            .map(|package| package.trim().to_string())
            .filter(|package| !package.is_empty())
            .collect::<Vec<_>>();
        requested.sort();
        requested.dedup();
        if requested.is_empty() {
            return Err(errors::NO_APPS_SELECTED.into());
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
        if let Some(ref fg) = protected_foreground_package {
            if requested.iter().any(|package| package == fg) {
                return Err(format!(
                    "{fg} está en primer plano y no se puede cerrar desde Game Boost."
                ));
            }
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
                .map_err(|e| errors::detail(errors::APP_CLOSE, format!("{package}: {e}")))?;
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
    .map_err(|e| errors::detail(errors::INTERNAL, e))?
}

#[tauri::command]
pub(crate) async fn kill_phone_apps(
    serial: String,
    packages: Vec<String>,
    force: bool,
    app: AppHandle,
) -> Result<DeviceMemoryStats, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
        let mut requested = packages
            .into_iter()
            .map(|pkg| pkg.trim().to_string())
            .filter(|pkg| !pkg.is_empty())
            .collect::<Vec<_>>();
        requested.sort();
        requested.dedup();
        if requested.is_empty() {
            return Err(errors::NO_APPS_SELECTED.into());
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
        let foreground = foreground_package(&adb, &serial);
        if let Some(ref fg) = foreground {
            if requested.iter().any(|package| package == fg) {
                return Err(errors::detail(errors::APP_FOREGROUND, fg));
            }
        }
        if let Some(package) = requested
            .iter()
            .find(|package| protected_package_reason(package).is_some())
        {
            return Err(errors::detail(errors::APP_PROTECTED, package));
        }
        for package in requested {
            let action = if force { "force-stop" } else { "kill" };
            let output = hidden_command(&adb)
                .args(["-s", &serial, "shell", "am", action, &package])
                .output()
                .map_err(|e| errors::detail(errors::APP_CLOSE, format!("{package}: {e}")))?;
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
    .map_err(|e| errors::detail(errors::INTERNAL, e))?
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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
}
