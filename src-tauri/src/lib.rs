//! Aether Gaming Desktop — Tauri backend entry point.
//!
//! This file wires modules together and registers Tauri commands.
//! Business logic lives in the sibling modules:
//!
//! - [`tools`]       — binary detection (`adb`, `scrcpy`)
//! - [`device`]      — device listing, SDK version, installed/foreground packages
//! - [`keymapper`]   — supported mapper registry, activation / deactivation
//! - [`phone`]       — phone RAM, heavy-app detection, safe force-stop
//! - [`errors`]      — stable error codes returned to the frontend
//! - [`device_watch`] — push-based device change events (`adb track-devices`)
//! - [`scrcpy`]      — mirror process lifecycle and FPS telemetry
//! - [`diagnostics`] — independent telemetry probes, session tracking, bookmarks
//! - [`system`]      — system stats and safe process termination
//! - [`types`]       — shared data types

mod device;
mod device_watch;
mod diagnostics;
mod errors;
mod keymapper;
mod phone;
mod scrcpy;
mod system;
mod tools;
mod types;

use diagnostics::DiagnosticsState;
use scrcpy::{MirrorProcess, MirrorTelemetry};

pub fn trigger_mark_stutter_cli() {
    #[cfg(unix)]
    {
        let sock_path = std::env::var("XDG_RUNTIME_DIR")
            .map(|d| format!("{d}/aether-relay-ipc.sock"))
            .unwrap_or_else(|_| "/tmp/aether-relay-ipc.sock".to_string());
        use std::io::{Read, Write};
        match std::os::unix::net::UnixStream::connect(&sock_path) {
            Ok(mut stream) => {
                let _ = stream.write_all(b"MARK_STUTTER\n");
                let mut resp = String::new();
                let _ = stream.read_to_string(&mut resp);
                println!("{}", resp.trim());
            }
            Err(e) => {
                eprintln!("Aether Relay is not running or IPC unavailable: {e}");
                std::process::exit(1);
            }
        }
    }
    #[cfg(not(unix))]
    {
        use std::io::{Read, Write};
        match std::net::TcpStream::connect("127.0.0.1:42427") {
            Ok(mut stream) => {
                let _ = stream.write_all(b"MARK_STUTTER\n");
                let mut resp = String::new();
                let _ = stream.read_to_string(&mut resp);
                println!("{}", resp.trim());
            }
            Err(e) => {
                eprintln!("Aether Relay is not running or IPC unavailable: {e}");
                std::process::exit(1);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let diag_state = DiagnosticsState::default();
    let diag_inner = diag_state.0.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(MirrorProcess::default())
        .manage(MirrorTelemetry::default())
        .manage(diag_state)
        .setup(move |app| {
            let handle = app.handle().clone();
            diagnostics::start_ipc_listener(handle.clone(), diag_inner);
            device_watch::start(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tools::check_environment,
            device::list_devices,
            keymapper::activate_apps,
            keymapper::deactivate_apps,
            keymapper::check_keymapper_status,
            phone::device_memory,
            phone::list_preset_apps,
            phone::list_phone_processes,
            phone::boost_phone_memory,
            phone::kill_phone_apps,
            system::system_stats,
            system::terminate_process,
            scrcpy::start_mirror,
            scrcpy::stop_mirror,
            scrcpy::mirror_fps,
            scrcpy::mirror_state,
            scrcpy::get_scrcpy_logs,
            scrcpy::clear_scrcpy_logs,
            diagnostics::get_session_diagnostics,
            diagnostics::get_session_samples,
            diagnostics::mark_stutter,
            diagnostics::get_stutter_bookmarks,
            diagnostics::export_diagnostics_json,
            diagnostics::set_diagnostics_probes,
        ])
        .build(tauri::generate_context!())
        .expect("error while building Aether Gaming Desktop")
        .run(|_app, event| {
            if let tauri::RunEvent::Exit = event {
                device_watch::stop();
            }
        });
}
