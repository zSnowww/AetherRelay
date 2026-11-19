//! Push-based device change notifications.
//!
//! Runs `adb track-devices`, which prints a message every time the device list
//! changes (4 hex digits of length, then the list). Each message emits a
//! `devices-changed` event so the UI refreshes on change instead of polling.

use crate::tools::{hidden_command, resolve_tool};
use std::{
    io::Read,
    process::{Child, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

pub(crate) const DEVICES_CHANGED_EVENT: &str = "devices-changed";

static WATCHER: Mutex<Option<Child>> = Mutex::new(None);
static SHUTDOWN: AtomicBool = AtomicBool::new(false);

/// Starts the watcher thread. It restarts `adb track-devices` if it exits
/// (for example when the adb server is restarted).
pub(crate) fn start(app: AppHandle) {
    thread::spawn(move || {
        while !SHUTDOWN.load(Ordering::Relaxed) {
            if let Some(adb) = resolve_tool("adb", &app) {
                let spawned = hidden_command(&adb)
                    .arg("track-devices")
                    .stdin(Stdio::null())
                    .stdout(Stdio::piped())
                    .stderr(Stdio::null())
                    .spawn();
                if let Ok(mut child) = spawned {
                    let stdout = child.stdout.take();
                    if let Ok(mut guard) = WATCHER.lock() {
                        *guard = Some(child);
                    }
                    if let Some(mut out) = stdout {
                        read_messages(&mut out, || {
                            let _ = app.emit(DEVICES_CHANGED_EVENT, ());
                        });
                    }
                    reap();
                }
            }
            thread::sleep(Duration::from_secs(3));
        }
    });
}

/// Stops the watcher and kills the `adb track-devices` child.
pub(crate) fn stop() {
    SHUTDOWN.store(true, Ordering::Relaxed);
    reap();
}

fn reap() {
    if let Some(mut child) = WATCHER.lock().ok().and_then(|mut g| g.take()) {
        let _ = child.kill();
        let _ = child.wait();
    }
}

/// Calls `on_change` once per length-prefixed message until the stream ends.
fn read_messages(reader: &mut impl Read, mut on_change: impl FnMut()) {
    let mut len_buf = [0u8; 4];
    loop {
        if reader.read_exact(&mut len_buf).is_err() {
            return;
        }
        let Some(len) = std::str::from_utf8(&len_buf)
            .ok()
            .and_then(|hex| usize::from_str_radix(hex, 16).ok())
        else {
            return;
        };
        let mut payload = vec![0u8; len];
        if reader.read_exact(&mut payload).is_err() {
            return;
        }
        on_change();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn read_messages_counts_each_length_prefixed_update() {
        let stream = b"0018ATEHBB5516900383\tdevice\n00000018ATEHBB5516900383\tdevice\n";
        let mut count = 0;
        read_messages(&mut &stream[..], || count += 1);
        assert_eq!(count, 3);
    }

    #[test]
    fn read_messages_stops_on_garbage() {
        let mut count = 0;
        read_messages(&mut &b"zzzz"[..], || count += 1);
        assert_eq!(count, 0);
    }
}
