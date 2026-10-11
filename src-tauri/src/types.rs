use serde::{Deserialize, Serialize};

// ── Device / environment types ────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ToolInfo {
    pub(crate) available: bool,
    pub(crate) path: Option<String>,
    pub(crate) version: Option<String>,
}

#[derive(Serialize)]
pub(crate) struct EnvironmentStatus {
    pub(crate) adb: ToolInfo,
    pub(crate) scrcpy: ToolInfo,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct Device {
    pub(crate) serial: String,
    pub(crate) state: String,
    pub(crate) model: Option<String>,
    pub(crate) product: Option<String>,
    pub(crate) transport_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PresetAppInfo {
    pub(crate) id: String,
    pub(crate) name: String,
    pub(crate) package: String,
    pub(crate) installed: bool,
    pub(crate) running: bool,
}

/// A running, user-installed Android application reported by `dumpsys meminfo`.
#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PhoneProcessInfo {
    pub(crate) pid: Option<u32>,
    pub(crate) name: String,
    pub(crate) package: String,
    pub(crate) memory_bytes: u64,
    pub(crate) protected: bool,
    pub(crate) protection_reason: Option<String>,
    pub(crate) icon: Option<String>,
}

// ── Mirror types ──────────────────────────────────────────────────────────────

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MirrorOptions {
    pub(crate) serial: String,
    pub(crate) max_size: u32,
    pub(crate) video_bit_rate_mbps: u32,
    pub(crate) max_fps: u32,
    pub(crate) turn_screen_off: bool,
    pub(crate) stay_awake: bool,
    pub(crate) fullscreen: bool,
    pub(crate) audio: bool,
    pub(crate) always_on_top: bool,
    #[serde(default)]
    pub(crate) launch_panda_mouse_pro: bool,
    #[serde(default)]
    pub(crate) launch_app_package: Option<String>,
    #[serde(default)]
    pub(crate) target_app: Option<String>,
    #[serde(default)]
    pub(crate) shortcut_mod: Option<String>,
    pub(crate) virtual_display: bool,
    #[serde(default)]
    pub(crate) video_codec: Option<String>,
    #[serde(default)]
    pub(crate) audio_codec: Option<String>,
    #[serde(default)]
    pub(crate) audio_buffer_ms: Option<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MirrorState {
    pub(crate) running: bool,
    pub(crate) pid: Option<u32>,
    pub(crate) serial: Option<String>,
}

// ── System / process types ────────────────────────────────────────────────────

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemProcess {
    pub(crate) pid: u32,
    pub(crate) name: String,
    pub(crate) command: String,
    pub(crate) memory_bytes: u64,
    pub(crate) state: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemStats {
    pub(crate) total_memory_bytes: u64,
    pub(crate) used_memory_bytes: u64,
    pub(crate) processes: Vec<SystemProcess>,
}

// ── Activation targets ────────────────────────────────────────────────────────

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

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivationLog {
    pub(crate) timestamp: String,
    pub(crate) message: String,
    pub(crate) is_error: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ActivationResult {
    pub(crate) success: bool,
    pub(crate) app_name: String,
    pub(crate) package_name: String,
    pub(crate) script_used: String,
    pub(crate) logs: Vec<ActivationLog>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeviceMemoryStats {
    pub(crate) total_bytes: u64,
    pub(crate) used_bytes: u64,
    pub(crate) available_bytes: u64,
    pub(crate) percentage: u32,
}

/// Outcome of a scoped Android Game Boost run.
///
/// The booster only stops known, user-visible background apps.  Returning the
/// before/after samples makes the effect observable instead of implying that a
/// cache command always freed memory.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameBoostResult {
    pub(crate) before: DeviceMemoryStats,
    pub(crate) after: DeviceMemoryStats,
    pub(crate) stopped_packages: Vec<String>,
    pub(crate) protected_foreground_package: Option<String>,
}
