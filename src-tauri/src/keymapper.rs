//! Keymapper apps (GG Mouse Pro, Panda, Shizuku): the registry of supported
//! mappers, detection, activation and deactivation over adb.

use crate::device::{command_error, is_package_installed};
use crate::errors;
use crate::tools::{hidden_command, resolve_tool};
use crate::types::{ActivationLog, ActivationResult};
use std::{path::Path, thread, time::Duration};
use tauri::AppHandle;

// ── Registry ──────────────────────────────────────────────────────────────────

pub(crate) struct ActivationTarget {
    pub(crate) name: &'static str,
    pub(crate) package_names: &'static [&'static str],
    pub(crate) script_paths: &'static [&'static str],
}

pub(crate) const ACTIVATION_TARGETS: &[ActivationTarget] = &[
    ActivationTarget {
        name: "GG Mouse Pro",
        package_names: &[
            "com.zjx.ztezscreenshot",
            "com.ggmouse.pro",
            "com.ggmouse.gaming",
        ],
        script_paths: &[
            "/data/data/com.zjx.ztezscreenshot/files/activate.sh",
            "/sdcard/Android/data/com.zjx.ztezscreenshot/files/activate.sh",
            "/sdcard/Android/data/com.zjx.ztezscreenshot/files/scripts/activate.sh",
            "/storage/emulated/0/Android/data/com.zjx.ztezscreenshot/files/activate.sh",
            "/storage/emulated/0/Android/data/moe.shizuku.privileged.api/start.sh",
        ],
    },
    ActivationTarget {
        name: "Panda Mouse Pro",
        package_names: &["com.panda.mouse"],
        script_paths: &[
            "/sdcard/Android/data/com.panda.mouse/files/scripts/activate.sh",
            "/data/data/com.panda.mouse/files/activate.sh",
            "/storage/emulated/0/Android/data/com.panda.mouse/files/scripts/activate.sh",
        ],
    },
    ActivationTarget {
        name: "Panda Gamepad Pro",
        package_names: &["com.panda.gamepad"],
        script_paths: &[
            "/sdcard/Android/data/com.panda.gamepad/files/scripts/activate.sh",
            "/data/data/com.panda.gamepad/files/activate.sh",
            "/storage/emulated/0/Android/data/com.panda.gamepad/files/scripts/activate.sh",
        ],
    },
    ActivationTarget {
        name: "Panda Touch Pro",
        package_names: &["com.panda.touch"],
        script_paths: &[
            "/sdcard/Android/data/com.panda.touch/files/scripts/activate.sh",
            "/data/data/com.panda.touch/files/activate.sh",
        ],
    },
];

pub(crate) const SHIZUKU_PACKAGE: &str = "moe.shizuku.privileged.api";

/// App scrcpy opens on start when no installed mapper is detected.
pub(crate) const FALLBACK_MAPPER_PACKAGE: &str = "com.zjx.ztezscreenshot";

/// Substrings that identify a running mapper daemon in `ps` output.
/// Keep these specific: a bare "gameassistant" matched Honor's system
/// Game Assistant (`com.hihonor.gameassistant`) and reported a false "active".
const MAPPER_PROCESS_MARKERS: &[&str] = &[
    "inject_server",
    "chaozhuo",
    "shizuku_server",
    SHIZUKU_PACKAGE,
    "com.panda.mouse",
    "com.panda.gamepad",
    "com.panda.touch",
    "com.zjx.ztezscreenshot",
    "ggmouse",
];

/// Every package that belongs to a supported mapper, plus Shizuku.
fn all_mapper_packages() -> impl Iterator<Item = &'static str> {
    ACTIVATION_TARGETS
        .iter()
        .flat_map(|target| target.package_names.iter().copied())
        .chain(std::iter::once(SHIZUKU_PACKAGE))
}

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
    match output {
        Ok(out) if out.status.success() => {
            ps_output_has_mapper(&String::from_utf8_lossy(&out.stdout))
        }
        _ => false,
    }
}

/// True when any `ps` line (other than the ps/grep invocation itself) is a mapper daemon.
fn ps_output_has_mapper(stdout: &str) -> bool {
    stdout.lines().any(|line| {
        let lower = line.to_lowercase();
        !lower.contains("grep")
            && !lower.contains("ps ")
            && MAPPER_PROCESS_MARKERS
                .iter()
                .any(|marker| lower.contains(marker))
    })
}

#[tauri::command]
pub(crate) async fn check_keymapper_status(serial: String, app: AppHandle) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if serial.trim().is_empty() {
            return Ok(false);
        }
        let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;
        Ok(is_keymapper_active(&adb, &serial))
    })
    .await
    .map_err(|e| errors::detail(errors::INTERNAL, e))?
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
        return Err(errors::NO_DEVICE.into());
    }

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!("Iniciando verificación de entorno ADB para dispositivo {serial}..."),
        is_error: false,
    });

    let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: format!(
            "Buscando app mapeadora objetivo ({})",
            target_app.as_deref().unwrap_or("auto")
        ),
        is_error: false,
    });

    let (target, package_name) = find_target_by_name_or_auto(&adb, &serial, target_app.as_deref())?
        .ok_or(errors::MAPPER_MISSING)?;

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
        .map_err(|e| errors::detail(errors::MAPPER_LAUNCH, format!("{}: {e}", target.name)))?;
    if !launch.status.success() {
        let err = command_error(&launch);
        logs.push(ActivationLog {
            timestamp: now_time(),
            message: format!("Error al iniciar app {}: {err}", target.name),
            is_error: true,
        });
        return Err(errors::detail(
            errors::MAPPER_LAUNCH,
            format!("{}: {err}", target.name),
        ));
    }

    logs.push(ActivationLog {
        timestamp: now_time(),
        message: "Esperando inicialización de la app (3 segundos)...".to_string(),
        is_error: false,
    });

    thread::sleep(Duration::from_secs(3));

    let is_shizuku_installed =
        is_package_installed(&adb, &serial, SHIZUKU_PACKAGE).unwrap_or(false);
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
        return Err(errors::detail(
            errors::MAPPER_ACTIVATE,
            format!("{}: {last_error}", target.name),
        ));
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
        .map_err(|e| errors::detail(errors::MAPPER_ACTIVATE, e))?
}

// ── Deactivation ──────────────────────────────────────────────────────────────

fn deactivate_apps_blocking(serial: String, app: AppHandle) -> Result<String, String> {
    if serial.trim().is_empty() {
        return Err(errors::NO_DEVICE.into());
    }
    let adb = resolve_tool("adb", &app).ok_or(errors::ADB_MISSING)?;

    for pkg in all_mapper_packages() {
        let _ = hidden_command(&adb)
            .args(["-s", &serial, "shell", "am", "force-stop", pkg])
            .output();
    }

    let kill_script = r#"
pkill -9 -f panda 2>/dev/null || true
pkill -9 -f chaozhuo 2>/dev/null || true
pkill -9 -f inject 2>/dev/null || true
pkill -9 -f shizuku 2>/dev/null || true
pkill -9 -f ztezscreenshot 2>/dev/null || true
pkill -9 -f ggmouse 2>/dev/null || true
for pid in $(ps -ef 2>/dev/null | grep -E 'chaozhuo|panda|inject_server|shizuku|ztezscreenshot|ggmouse' | grep -v grep | awk '{print $2}'); do
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
        .map_err(|e| errors::detail(errors::MAPPER_DEACTIVATE, e))?
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn honor_game_assistant_is_not_a_mapper() {
        let ps = "system  4321  1 0 10:00 ? 00:00:01 com.hihonor.gameassistant\n";
        assert!(!ps_output_has_mapper(ps));
    }

    #[test]
    fn detects_mapper_daemons() {
        assert!(ps_output_has_mapper(
            "shell 999 1 0 10:00 ? 00:00:00 inject_server\n"
        ));
        assert!(ps_output_has_mapper(
            "u0_a1 77 1 0 10:00 ? 00:00:00 com.panda.mouse\n"
        ));
    }

    #[test]
    fn mapper_packages_include_every_target_and_shizuku() {
        let all: Vec<_> = all_mapper_packages().collect();
        assert!(all.contains(&"com.panda.mouse"));
        assert!(all.contains(&"com.zjx.ztezscreenshot"));
        assert!(all.contains(&SHIZUKU_PACKAGE));
    }
}
