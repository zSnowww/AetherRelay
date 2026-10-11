//! Aether Gaming Desktop — Tauri backend entry point.
//!
//! This file wires modules together and registers Tauri commands.
//! Business logic lives in the sibling modules:
//!
//! - [`tools`]       — binary detection (`adb`, `scrcpy`)
//! - [`adb`]         — device listing, app activation / deactivation
//! - [`scrcpy`]      — mirror process lifecycle and FPS telemetry
//! - [`diagnostics`] — independent telemetry probes, session tracking, bookmarks
//! - [`system`]      — system stats and safe process termination
//! - [`types`]       — shared data types

mod adb;
mod diagnostics;
mod scrcpy;
mod system;
mod tools;
mod types;

use diagnostics::DiagnosticsState;
use scrcpy::{MirrorProcess, MirrorTelemetry};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(MirrorProcess::default())
        .manage(MirrorTelemetry::default())
        .manage(DiagnosticsState::default())
        .invoke_handler(tauri::generate_handler![
            tools::check_environment,
            adb::list_devices,
            adb::activate_apps,
            adb::deactivate_apps,
            adb::check_keymapper_status,
            adb::device_memory,
            adb::list_preset_apps,
            adb::list_phone_processes,
            adb::boost_phone_memory,
            adb::kill_phone_apps,
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running Aether Gaming Desktop");
}
