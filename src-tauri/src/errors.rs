//! Stable error codes returned to the frontend.
//!
//! Commands return `Err(String)` as `"E_CODE"` or `"E_CODE: detail"`. The
//! frontend translates by code (`src/i18n.ts`), so wording changes here never
//! break localisation. `detail` is technical context (adb output, package names).

pub(crate) const ADB_MISSING: &str = "E_ADB_MISSING";
pub(crate) const SCRCPY_MISSING: &str = "E_SCRCPY_MISSING";
pub(crate) const ADB_FAILED: &str = "E_ADB_FAILED";
pub(crate) const NO_DEVICE: &str = "E_NO_DEVICE";
pub(crate) const MAPPER_MISSING: &str = "E_MAPPER_MISSING";
pub(crate) const MAPPER_LAUNCH: &str = "E_MAPPER_LAUNCH";
pub(crate) const MAPPER_ACTIVATE: &str = "E_MAPPER_ACTIVATE";
pub(crate) const MAPPER_DEACTIVATE: &str = "E_MAPPER_DEACTIVATE";
pub(crate) const VIRTUAL_DISPLAY_SDK: &str = "E_VIRTUAL_DISPLAY_SDK";
pub(crate) const MIRROR_STATE: &str = "E_MIRROR_STATE";
pub(crate) const MIRROR_RUNNING: &str = "E_MIRROR_RUNNING";
pub(crate) const MIRROR_START: &str = "E_MIRROR_START";
pub(crate) const MIRROR_STOP: &str = "E_MIRROR_STOP";
pub(crate) const NO_APPS_SELECTED: &str = "E_NO_APPS_SELECTED";
pub(crate) const APP_CLOSE: &str = "E_APP_CLOSE";
pub(crate) const APP_FOREGROUND: &str = "E_APP_FOREGROUND";
pub(crate) const APP_PROTECTED: &str = "E_APP_PROTECTED";
#[cfg_attr(target_os = "linux", allow(dead_code))] // used on other platforms
pub(crate) const LINUX_ONLY_PERFORMANCE: &str = "E_LINUX_ONLY_PERFORMANCE";
#[cfg_attr(target_os = "linux", allow(dead_code))] // used on other platforms
pub(crate) const LINUX_ONLY_TERMINATE: &str = "E_LINUX_ONLY_TERMINATE";
pub(crate) const PROCESS_FORBIDDEN: &str = "E_PROCESS_FORBIDDEN";
pub(crate) const PROCESS_NOT_FOUND: &str = "E_PROCESS_NOT_FOUND";
pub(crate) const PROCESS_TERMINATE: &str = "E_PROCESS_TERMINATE";
pub(crate) const NO_SESSION: &str = "E_NO_SESSION";
pub(crate) const INTERNAL: &str = "E_INTERNAL";

/// `"E_CODE: detail"`.
pub(crate) fn detail(code: &str, detail: impl std::fmt::Display) -> String {
    format!("{code}: {detail}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detail_formats_code_and_context() {
        assert_eq!(detail(ADB_FAILED, "no devices"), "E_ADB_FAILED: no devices");
    }
}
