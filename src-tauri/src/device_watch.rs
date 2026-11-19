//! Push-based device change notifications.
//!
//! Opens a socket to the adb server and sends `host:track-devices`; the server
//! then writes a message (4 hex digits of length, then the device list) every
//! time the list changes, and each one emits a `devices-changed` event so the
//! UI refreshes on change instead of polling.
//!
//! A socket instead of an `adb track-devices` child process: if the app is
//! killed, the OS closes the socket and nothing is left running.

use crate::tools::{hidden_command, resolve_tool};
use std::{
    io::{Read, Write},
    net::{Shutdown, TcpStream},
    process::Stdio,
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{AppHandle, Emitter};

pub(crate) const DEVICES_CHANGED_EVENT: &str = "devices-changed";

const DEFAULT_ADB_SERVER_PORT: u16 = 5037;
const RETRY_DELAY: Duration = Duration::from_secs(3);

static CONNECTION: Mutex<Option<TcpStream>> = Mutex::new(None);
static SHUTDOWN: AtomicBool = AtomicBool::new(false);

/// Starts the watcher thread. It reconnects if the adb server restarts.
pub(crate) fn start(app: AppHandle) {
    thread::spawn(move || {
        while !SHUTDOWN.load(Ordering::Relaxed) {
            ensure_adb_server(&app);
            if let Ok(mut stream) = connect_and_track() {
                if let (Ok(clone), Ok(mut guard)) = (stream.try_clone(), CONNECTION.lock()) {
                    *guard = Some(clone);
                }
                read_messages(&mut stream, || {
                    let _ = app.emit(DEVICES_CHANGED_EVENT, ());
                });
                if let Ok(mut guard) = CONNECTION.lock() {
                    *guard = None;
                }
            }
            if !SHUTDOWN.load(Ordering::Relaxed) {
                thread::sleep(RETRY_DELAY);
            }
        }
    });
}

/// Stops the watcher by closing its socket.
pub(crate) fn stop() {
    SHUTDOWN.store(true, Ordering::Relaxed);
    if let Some(stream) = CONNECTION.lock().ok().and_then(|mut g| g.take()) {
        let _ = stream.shutdown(Shutdown::Both);
    }
}

/// `adb start-server` returns at once when the server is already up.
fn ensure_adb_server(app: &AppHandle) {
    if let Some(adb) = resolve_tool("adb", app) {
        let _ = hidden_command(adb)
            .arg("start-server")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    }
}

fn server_port() -> u16 {
    std::env::var("ANDROID_ADB_SERVER_PORT")
        .ok()
        .and_then(|port| port.parse().ok())
        .unwrap_or(DEFAULT_ADB_SERVER_PORT)
}

fn connect_and_track() -> std::io::Result<TcpStream> {
    let mut stream = TcpStream::connect(("127.0.0.1", server_port()))?;
    stream.write_all(&request("host:track-devices"))?;
    let mut status = [0u8; 4];
    stream.read_exact(&mut status)?;
    if &status != b"OKAY" {
        return Err(std::io::Error::other("adb server refused track-devices"));
    }
    Ok(stream)
}

/// adb smart-socket request: 4 hex digits of payload length, then the payload.
fn request(service: &str) -> Vec<u8> {
    format!("{:04x}{service}", service.len()).into_bytes()
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
    fn request_is_length_prefixed_in_hex() {
        assert_eq!(request("host:track-devices"), b"0012host:track-devices");
    }

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
