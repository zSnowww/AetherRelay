export type Locale = "es" | "en" | "zh-CN";

const zh = {
  appTitle: "Aether Relay",
  appDescriptionBefore: "借助开源项目",
  appDescriptionAfter: "，我们可以投射手机屏幕到电脑上，使用电脑的键鼠玩手机游戏！",
  selectDevice: "选择设备",
  refresh: "刷新",
  connectionHelp: "连接帮助",
  closeHelp: "关闭帮助",
  connectDeviceTitle: "如何连接 Android 设备",
  connectDeviceStep1: "打开手机设置中的“关于手机”，连续点击“版本号 / Build number”7 次，开启开发者选项。",
  connectDeviceStep2: "进入“开发者选项”，开启“USB 调试”。",
  connectDeviceStep3: "使用支持数据传输的 USB 线将手机连接到电脑，并保持手机解锁。",
  connectDeviceStep4: "手机弹出 USB 调试授权窗口后，选择“允许”或“始终允许此电脑”。",
  connectDeviceTip: "完成后设备会自动出现；也可以点击右侧刷新按钮。不同品牌手机的设置名称可能略有不同。",
  waitingDevice: "等待 USB 或无线设备",
  enableUsbDebugging: "开启 USB 调试并允许此电脑进行调试",
  connected: "已连接",
  unauthorized: "未授权",
  unavailable: "未找到",
  available: "可用",
  mirrorSettings: "镜像设置",
  recommended: "推荐配置",
  maxResolution: "最高分辨率",
  maxFps: "最高帧率",
  videoBitrate: "视频码率",
  selectKeymapper: "目标映射 App",
  autoDetect: "自动检测 (推荐)",
  ggMousePro: "GG Mouse Pro",
  pandaMousePro: "Panda Mouse Pro",
  pandaGamepadPro: "Panda Gamepad Pro",
  pandaTouchPro: "Panda Touch Pro",
  audioForwarding: "声音转发",
  stayAwake: "保持设备唤醒",
  startFullscreen: "启动即全屏",
  alwaysOnTop: "窗口置顶",
  launchPmp: "启动镜像时打开选中的映射 App",
  turnScreenOff: "启动后关闭手机屏幕",
  mappingMode: "键鼠映射模式",
  mappingDescription: "默认使用 -K -M 与 --mouse-bind=++++:++++，键盘和全部鼠标按键直接发送给手机。",
  enabledByDefault: "默认开启",
  virtualDisplayUnavailable: "独立投屏模式",
  virtualDisplayDescription: "将游戏独立投到电脑上游玩，手机主屏仍可正常操作；需要 Android 10 或更高版本。",
  experimental: "实验性",
  shortcuts: "快捷键速查",
  modDescription: "MOD = Command 或左 Alt",
  releaseMouse: "释放 / 捕获鼠标",
  toggleFullscreen: "进入 / 退出全屏",
  quitMirror: "退出镜像",
  togglePhoneScreen: "开关手机屏幕",
  goHome: "返回桌面",
  goBack: "返回上一级",
  recentTasks: "最近任务",
  rotateScreen: "旋转手机屏幕",
  adjustVolume: "调节音量",
  pasteClipboard: "粘贴剪贴板",
  keyboardSettings: "打开物理键盘设置",
  toggleFps: "显示 / 隐藏 FPS",
  shortcutNote: "在 macOS 上 Command 对应左侧 ⌘ 键；Linux/Windows 可使用左 Alt。鼠标映射模式下，左 Command、右 Command 或左 Alt 均可切换鼠标捕获。",
  startMirror: "启动镜像",
  startIndependentDisplay: "启动独立投屏",
  stopMirror: "停止镜像",
  activateApps: "激活映射 App",
  activatingApps: "正在启动并激活映射 App…",
  activationCommandCompleted: "{app} 激活命令已执行",
  deactivateApps: "停用 / 结束映射",
  deactivatingApps: "正在停止映射 App 及后台服务…",
  deactivationCompleted: "已成功终止所有映射进程及服务",
  checkingEnvironment: "正在检查运行环境…",
  devicesFound: "已发现 {count} 台可用设备",
  noDevices: "未发现已授权的 Android 设备",
  mirrorStarted: "镜像已启动 · PID {pid}",
  mirrorStopped: "镜像已停止",
  mirrorWindowExited: "镜像窗口已退出",
  officialWebsite: "官方网站",
  adbMissing: "未找到 adb，请重新安装",
  adbRunFailed: "无法运行 adb：{detail}",
  launchAppFailed: "无法启动映射 App：{detail}",
  activateAppFailed: "映射 App 激活失败：{detail}",
  deactivateAppFailed: "停止映射进程失败：{detail}",
  supportedAppMissing: "未安装受支持的映射 App (GG Mouse Pro / Panda)",
  selectDeviceError: "请先选择设备",
  virtualDisplayError: "独立投屏需要 Android 10 或更高版本：{detail}",
  scrcpyMissing: "未找到 scrcpy，请重新安装",
  processUnavailable: "镜像进程状态不可用",
  mirrorAlreadyRunning: "镜像已经在运行",
  startFailed: "启动 scrcpy 失败：{detail}",
  stopFailed: "停止 scrcpy 失败：{detail}"
  ,mirrorGuide: "镜像参数说明", guideResolution: "分辨率", guideResolutionDescription: "上限越高越清晰，但编码与传输负载也越高。", guideBitrate: "视频码率", guideBitrateDescription: "更高码率保留更多细节；USB 一般可用 12–24 Mbps，网络差时降低它。", guideFps: "最大帧率", guideFpsDescription: "这是抓取上限，不会创造手机或游戏没有的帧。", guideLatency: "延迟", guideLatencyDescription: "延迟主要受编码、USB/Wi‑Fi 和电脑解码影响；降低分辨率和码率通常最有效。"
  // Nav tabs
  ,tabMirror: "镜像"
  ,tabPerformance: "性能"
  ,tabPreferences: "配置"
  // Performance panel
  ,performanceEyebrow: "系统与设备"
  ,performanceTitle: "性能监控"
  ,performanceSubtitle: "双端实时监控：电脑主机与手机运行内存（RAM）。"
  ,refreshButton: "刷新"
  ,memoryInUse: "已用内存"
  ,calculating: "计算中…"
  ,processesByMemory: "电脑按内存排序的进程"
  ,processesVisible: "{count} 个可见"
  ,processNote: "仅列出当前用户的进程。\"关闭\" 发送正常终止信号，不强制结束。"
  ,confirmClose: "关闭 \"{name}\"（PID {pid}）？可能丢失未保存的工作。"
  ,closeProcessTitle: "关闭 {name}"
  ,closeButton: "关闭"
  ,processNotOwned: "进程 {pid} 不属于当前用户。"
  ,processNotFound: "未找到进程 {pid}。"
  ,terminateNotAvailable: "进程终止仅在 Linux 上可用。"
  ,performanceNotAvailable: "性能面板目前仅在 Linux 上可用。"
  ,phoneMemoryTitle: "手机运行内存 (Android RAM)"
  ,phoneMemoryDevice: "设备: {device}"
  ,phoneMemoryOptimal: "内存状态优良，不易发生掉帧或卡顿。"
  ,phoneMemoryWarning: "手机内存占用较高（>80%），建议清理手机后台避免游戏掉帧。"
  ,phoneMemoryUnavailable: "无法读取手机内存，请确认设备已连接并开启 USB 调试。"
  ,noDeviceSelectedForMemory: "未选择手机。请在“镜像”页连接并选择手机以监控其 RAM。"
  ,phoneMemoryImpactExplainer: "提示：手机内存不足是手游掉帧、输入延迟和后台被杀的核心原因；电脑端主要负责音视频解码与键鼠转发。"
  ,pcMemoryTitle: "电脑主机内存 (Host PC RAM)"
  ,freeMemory: "{free} 可用"
  ,phoneGameBoost: "游戏极速清理 (Game Boost)"
  ,phoneGameBoostBtn: "释放手机内存"
  ,phoneGameBoostDesc: "关闭 Android 后台闲置任务并清理应用缓存，为游戏释放最大运存并保持满帧运行。"
  ,phoneGameBoostIdle: "未检测到可安全关闭的已知后台应用。游戏与当前前台应用不会被触碰。"
  ,phoneGameBoostResult: "已关闭 {count} 个后台应用 · 额外可用 {freed}"
  ,phoneProcessesTitle: "按内存排列的手机应用"
  ,phoneProcessesDesc: "选择要关闭的第三方后台应用。游戏与映射工具已锁定保护。"
  ,phoneProcessAppColumn: "应用"
  ,phoneProcessMemoryColumn: "内存"
  ,phoneProcessStatusColumn: "状态"
  ,phoneProcessActionsColumn: "操作"
  ,phoneProcessesSelected: "已选择 {count} 个"
  ,phoneProcessProtected: "受保护"
  ,phoneProcessSelect: "可关闭"
  ,phoneProcessesUnavailable: "没有可读取的第三方运行应用；不同 Android 厂商可能限制进程内存数据。"
  ,phoneProcessesConfirm: "是否关闭这些已选择的后台应用？{apps}"
  ,phoneGameBoostRunning: "正在优化手机内存…"
  ,phoneGameBoostSuccess: "游戏极速清理完成！手机运存已释放。"
  ,phoneProcessTerminateConfirmTitle: "结束手机应用"
  ,phoneProcessTerminateConfirm: "确定要强制结束手机上的 {name}（PID {pid}，包名 {package}）吗？"
  ,phoneProcessSelectAll: "全选可清理"
  ,phoneProcessDeselectAll: "取消全选"
  ,phoneProcessClosed: "已结束手机应用：{name}"
  ,presetAppsTitle: "手机常驻重度应用清理"
  ,presetAppsDesc: "检测手机后台驻留的浏览器和社交应用，一键强制结束进程释放 RAM。"
  ,killAllRunningPresets: "一键清理全部在运行应用"
  ,killSelectedApp: "结束进程"
  ,appClosedNotice: "已强制停止手机应用：{name}"
  ,noPresetAppsDetected: "未检测到常驻重度应用"
  ,appsRunningBadge: "{count} 个运行中"
  ,appsInstalledBadge: "{count} 个已安装"
  // Preferences panel
  ,preferencesEyebrow: "首选项"
  ,preferencesTitle: "配置"
  ,preferencesSubtitle: "这些首选项保存在本机，将在下次镜像时应用。"
  ,shortcutModLabel: "快捷键修改键"
  ,shortcutModDescription: "scrcpy 允许更改 MOD 键，不影响各操作的组合键。"
  ,shortcutModUseAs: "用作 MOD"
  ,modAltOrSuper: "左 Alt 或左 Super"
  ,modAlt: "左 Alt"
  ,modSuper: "左 Super"
  ,modCtrl: "左 Ctrl"
  ,requireActivationFirst: "请先激活映射 App 再启动镜像"
  ,activationModalTitle: "映射 App 激活"
  ,activationSubtitle: "实时注入控制台与安全验证"
  ,tabLiveConsole: "实时日志"
  ,tabTransparency: "此脚本做了什么？（透明与安全）"
  ,activationStatusRunning: "正在激活映射…"
  ,activationStatusSuccess: "映射 App 已成功激活！"
  ,activationStatusFailed: "映射 App 激活失败"
  ,startMirrorNow: "立即启动镜像"
  ,copyLogs: "复制日志"
  ,logsCopied: "已复制！"
  ,close: "关闭"
  ,retry: "重试"
  ,keymapperActiveBadge: "已激活"
  ,keymapperInactiveBadge: "未激活"
  ,transparencyBadge: "透明与安全"
  ,transparencyHeroDesc: "Aether Relay 执行映射 App 的官方激活脚本，无需 Root，也不会危害您的手机安全与保修。"
  ,transparencyPoint1Title: "1. 为什么需要此脚本？"
  ,transparencyPoint1Desc: "出于安全考虑，Android 系统隔离了应用，不允许普通应用跨应用模拟键鼠点击。该脚本通过官方 ADB 调试接口，启动映射所需的输入服务。"
  ,transparencyPoint2Title: "2. 无需 Root，绝对安全"
  ,transparencyPoint2Desc: "不修改系统文件 (/system)，不改动固件，不破坏 Knox 与 SafetyNet / Play Integrity，手机银行与日常应用不受任何影响。"
  ,transparencyPoint3Title: "3. 内存中的临时后台服务"
  ,transparencyPoint3Desc: "脚本启动本地守护服务（inject_server 或 Shizuku），以 Android shell 用户运行，仅驻留在 RAM 内存中，手机重启后自动清除。"
  ,transparencyPoint4Title: "4. 完全可控，一键停止"
  ,transparencyPoint4Desc: "您可随时点击“停用 / 结束映射”按钮终止所有映射进程，设备即刻恢复初始状态。"
  ,transparencyCommandsTitle: "执行的 ADB 命令"
  ,transparencyCommandsDesc: "1. 启动映射 App（am monkey）\n2. 运行官方激活脚本（sh activate.sh）\n3. 验证守护进程状态（ps）"
  ,stepAdb: "ADB 连接与环境"
  ,stepDetect: "检测目标映射 App"
  ,stepLaunch: "在 Android 上启动 App"
  ,stepInject: "执行守护进程脚本"
  ,stepVerify: "验证服务运行状态"
  ,viewActivationLogs: "查看日志与详情"
  ,elapsedTime: "耗时"
  // Confirm modal & generic dialogs
  ,confirmAction: "确认操作"
  ,cancel: "取消"
  ,confirm: "确认"
  ,confirmCloseTitle: "结束系统进程"
  ,terminateProcess: "结束进程"
  ,resetPreferencesConfirm: "恢复默认配置？"
  ,resetPreferencesDesc: "所有画面编解码器、音频、快捷键和界面主题设置将重置为推荐值。"
  // Advanced preferences
  ,settingsCategoryInput: "输入与按键映射"
  ,settingsCategoryVideo: "视频引擎与画面"
  ,settingsCategoryAudio: "音频引擎与低延迟"
  ,settingsCategoryAppearance: "界面与主题"
  ,videoCodecLabel: "视频编解码器"
  ,videoCodecDesc: "H.264 兼容性最佳；H.265 (HEVC) 占用更低带宽与更低延迟；AV1 适合高端新机。"
  ,codecAuto: "自动检测 (推荐)"
  ,codecH264: "H.264 (AVC - 通用兼容)"
  ,codecH265: "H.265 (HEVC - 低延迟高压缩)"
  ,codecAV1: "AV1 (下一代硬件编码)"
  ,videoBufferLabel: "视频缓冲"
  ,videoBufferDesc: "0 ms 为超低延迟竞技模式；50 ms 为流畅缓冲模式。"
  ,bufferZero: "0 ms (超低延迟 / 电竞)"
  ,bufferSmooth: "50 ms (流畅防卡顿)"
  ,preferencesSavedNotice: "配置已更新"
  ,audioCodecLabel: "音频编解码器"
  ,audioCodecDesc: "Opus 在 scrcpy 中延迟与保真度最佳；AAC 兼容性广。"
  ,audioCodecAuto: "Opus (推荐)"
  ,audioCodecRaw: "RAW (无压缩音频流)"
  ,audioCodecFlac: "FLAC (无损音频)"
  ,audioBufferLabel: "音频缓冲 (ms)"
  ,audioBufferDesc: "若声音出现爆音或杂音，可适当增大音频缓冲。"
  ,audioBufferLow: "50 ms (超低延迟)"
  ,audioBufferDefault: "100 ms (默认均衡)"
  ,audioBufferHigh: "200 ms (平滑抗掉帧)"
  ,themeAccentLabel: "界面强调色"
  ,themeAccentDesc: "为 Aether Relay 选择心仪的主题配色风格。"
  ,themeLime: "Aether Lime (官方荧光绿)"
  ,themeCyan: "Cyber Cyan (赛博青蓝)"
  ,themeViolet: "Stealth Violet (暗夜紫)"
  ,themePink: "Sakura Pink (樱花粉)"
  ,themeAmber: "Solar Amber (烈阳琥珀)"
  ,languageLabel: "界面显示语言"
  ,languageDesc: "切换应用的显示语言（中/英/西）。"
  ,resetDefaults: "恢复推荐默认配置"
  ,keyRepeatTipTitle: "Free Fire / 吃鸡 WASD 移动卡顿？"
  ,keyRepeatTipDesc: "若长按 W 键导致摇杆重置或抽搐，这是操作系统按键连发导致的。在系统设置中调低按键重复率或在终端运行 xset r off 即可彻底解决。"
  ,updatesCategory: "软件更新"
  ,checkForUpdates: "检查更新"
  ,checkingForUpdates: "正在检查更新…"
  ,appUpToDate: "当前已是最新版本 (v{version})"
  ,updateAvailable: "发现新版本 v{version}！"
  ,downloadAndInstall: "立即下载并安装"
  ,downloadingUpdate: "正在下载更新…"
  ,updateInstalledRestart: "更新已安装完毕，正在重启…"
  ,updateCheckFailed: "检查更新失败，请稍后重试"
  ,checkForUpdatesDesc: "在 GitHub Releases 上检查是否有可用的新版 Aether Relay。"
  ,tabDiagnostics: "诊断"
  ,diagnosticsEyebrow: "会话遥测与故障排除"
  ,diagnosticsTitle: "会话诊断与延迟排查"
  ,diagnosticsSubtitle: "低开销实时监控 USB 速率、ADB 延迟、温度与 scrcpy 管道，定位卡顿与延迟根源。"
  ,adbLatencyTitle: "ADB 命令延迟"
  ,adbLatencySubtitle: "到设备的往返执行耗时（非显示延迟）"
  ,baselineLatency: "基线"
  ,captureFpsTitle: "采集帧率"
  ,captureFpsSubtitle: "手机编码端抓取速率（不等于显示刷新率）"
  ,batteryTempTitle: "电池温度"
  ,thermalStatusTitle: "热压力状态"
  ,usbLinkSpeedTitle: "USB 协商速率"
  ,usbLinkSubtitle: "通过 Linux sysfs 实时读取"
  ,reconnectCountTitle: "重连次数"
  ,activeEncoderTitle: "硬件编码器"
  ,activeDecoderTitle: "解码器与显示"
  ,markStutterButton: "标记卡顿 / Tirón"
  ,markStutterTip: "立即保存过去 60 秒与后续 30 秒的样本及日志快照"
  ,stutterMarkedNotice: "已记录卡顿标记（正在采集后续 30 秒窗口）"
  ,bookmarksTitle: "已标记事件记录"
  ,noBookmarksYet: "当前会话暂未标记任何卡顿事件。"
  ,bookmarkStateCollecting: "采集窗口中 (+30s)"
  ,bookmarkStateComplete: "已完成窗口"
  ,bookmarkStateInterrupted: "因会话结束中断"
  ,exportDiagnosticsButton: "导出诊断报告 (JSON)"
  ,exportSuccess: "诊断数据已复制到剪贴板，并准备好分享"
  ,scrcpyLogsTitle: "scrcpy 实时日志管道 (stdout + stderr)"
  ,filterAll: "全部"
  ,filterWarnings: "警告与错误"
  ,filterEncoder: "编解码 / 管道"
  ,clearLogs: "清空日志"
  ,logsEmpty: "暂无日志输出，启动镜像后将在此实时呈现"
  ,baselinePresetTitle: "受控测试基线配置 (Control Baseline)"
  ,baselinePresetDesc: "设为 1920px max、60 FPS、H.264、8 Mbps、关闭音频、0 ms 缓冲，用于排查性能变量。"
  ,applyBaselineButton: "应用基线测试预设"
  ,baselineApplied: "已应用 8 Mbps H.264 基线预设"
  ,forceWaylandOption: "强制原生 Wayland (SDL_VIDEODRIVER=wayland)"
  ,forceWaylandDesc: "在 Linux / Hyprland 环境下绕过 XWayland，测试能否消除帧同步微卡顿。"
  ,videoBufferOption: "视频抖动缓冲区 (Video Jitter Buffer)"
  ,videoBufferJitterDesc: "scrcpy 默认 0 ms 追求最低延迟；可测试 10 ms 或 20 ms 吸收 USB 抖动。"
  ,guideTitle: "根因定位向导：是视频延迟还是输入队列？"
  ,guideStep1Title: "测试 1：物理触屏 vs 键鼠 WASD"
  ,guideStep1Desc: "当感觉延迟时，直接用手指触碰手机屏幕。如果手机即时响应但电脑监视器显示慢，瓶颈在视频传输/解码。如果手机本身也响应慢，问题在 UHID / 映射器守护进程。"
  ,guideStep2Title: "测试 2：USB 协商与端口状态"
  ,guideStep2Desc: "检查上方 USB 速率是否为 480 Mbps (High-Speed)。若降为 12 Mbps (Full-Speed)，说明线材、接口或集线器发生硬件协商降级。"
  ,guideStep3Title: "测试 3：热降频与温度关联"
  ,guideStep3Desc: "若开局流畅而在温度超过 42 °C 后持续卡顿，但重新连接后即使温度未降立刻恢复流畅，说明根因更可能是队列累积而非硬件热降频。"
} as const;

const en: Record<keyof typeof zh, string> = {
  appTitle: "Aether Relay",
  appDescriptionBefore: "Mirror Android to your computer with",
  appDescriptionAfter: " and play with keyboard and mouse.",
  selectDevice: "Select device",
  refresh: "Refresh",
  connectionHelp: "Connection help",
  closeHelp: "Close help",
  connectDeviceTitle: "How to connect an Android device",
  connectDeviceStep1: "Open About phone in Settings and tap Build number 7 times to enable Developer options.",
  connectDeviceStep2: "Open Developer options and enable USB debugging.",
  connectDeviceStep3: "Connect your unlocked phone with a USB cable that supports data transfer.",
  connectDeviceStep4: "When the USB debugging prompt appears, tap Allow or Always allow from this computer.",
  connectDeviceTip: "Your device will appear automatically, or you can click Refresh. Setting names may vary by phone brand.",
  waitingDevice: "Waiting for a USB or wireless device",
  enableUsbDebugging: "Enable USB debugging and authorize this computer",
  connected: "Connected",
  unauthorized: "Unauthorized",
  unavailable: "Not found",
  available: "Available",
  mirrorSettings: "Mirror settings",
  recommended: "Recommended",
  maxResolution: "Max resolution",
  maxFps: "Max frame rate",
  videoBitrate: "Video bitrate",
  selectKeymapper: "Target Keymapper",
  autoDetect: "Auto-detect (Recommended)",
  ggMousePro: "GG Mouse Pro",
  pandaMousePro: "Panda Mouse Pro",
  pandaGamepadPro: "Panda Gamepad Pro",
  pandaTouchPro: "Panda Touch Pro",
  audioForwarding: "Forward audio",
  stayAwake: "Keep device awake",
  startFullscreen: "Start fullscreen",
  alwaysOnTop: "Always on top",
  launchPmp: "Open selected Keymapper when mirroring starts",
  turnScreenOff: "Turn phone screen off after starting",
  mappingMode: "Keyboard & mouse mapping",
  mappingDescription: "Forwards all keyboard and mouse input directly to your phone as native hardware.",
  enabledByDefault: "Enabled",
  virtualDisplayUnavailable: "Independent display mode",
  virtualDisplayDescription: "Play on your computer while keeping your phone free to use. Requires Android 10 or later.",
  experimental: "EXPERIMENTAL",
  shortcuts: "Shortcut reference",
  modDescription: "MOD = Left Alt or Command",
  releaseMouse: "Capture / release mouse",
  toggleFullscreen: "Enter / exit fullscreen",
  quitMirror: "Quit mirroring",
  togglePhoneScreen: "Toggle phone screen",
  goHome: "Go to Home",
  goBack: "Go back",
  recentTasks: "Recent apps",
  rotateScreen: "Rotate phone screen",
  adjustVolume: "Adjust volume",
  pasteClipboard: "Paste clipboard",
  keyboardSettings: "Open physical keyboard settings",
  toggleFps: "Show / hide FPS",
  shortcutNote: "On Linux/Windows, Left Alt toggles mouse capture/release. On macOS, Command is used.",
  startMirror: "Start mirroring",
  startIndependentDisplay: "Start independent display",
  stopMirror: "Stop mirroring",
  activateApps: "Activate Keymapper",
  activatingApps: "Starting and activating Keymapper…",
  activationCommandCompleted: "{app} activation command completed",
  deactivateApps: "Deactivate Keymapper",
  deactivatingApps: "Stopping Keymapper and background services…",
  deactivationCompleted: "Keymapper processes and services stopped successfully",
  checkingEnvironment: "Checking environment…",
  devicesFound: "Found {count} available device(s)",
  noDevices: "No authorized Android devices found",
  mirrorStarted: "Mirroring started · PID {pid}",
  mirrorStopped: "Mirroring stopped",
  mirrorWindowExited: "Mirror window closed",
  officialWebsite: "Official website",
  adbMissing: "adb was not found. Please reinstall the application.",
  adbRunFailed: "Could not run adb: {detail}",
  launchAppFailed: "Could not open the mapping app: {detail}",
  activateAppFailed: "Could not activate the mapping app: {detail}",
  deactivateAppFailed: "Failed to stop keymapper processes: {detail}",
  supportedAppMissing: "No supported keymapping app (GG Mouse Pro / Panda) is installed.",
  selectDeviceError: "Select a device first.",
  virtualDisplayError: "Independent display mode requires Android 10 or later: {detail}",
  scrcpyMissing: "scrcpy was not found.",
  processUnavailable: "The mirror process state is unavailable.",
  mirrorAlreadyRunning: "Mirroring is already running.",
  startFailed: "Could not start scrcpy: {detail}",
  stopFailed: "Could not stop scrcpy: {detail}",
  mirrorGuide: "What each mirror setting does",
  guideResolution: "Resolution",
  guideResolutionDescription: "A higher limit looks sharper, but increases encoding and transfer work.",
  guideBitrate: "Video bitrate",
  guideBitrateDescription: "More bitrate keeps more detail; use 12–24 Mbps over USB and lower it on weak networks.",
  guideFps: "Max frame rate",
  guideFpsDescription: "This is a capture ceiling—it cannot create frames the phone or game did not produce.",
  guideLatency: "Delay",
  guideLatencyDescription: "Encoding, USB/Wi‑Fi and PC decoding determine delay; reducing resolution and bitrate usually helps most.",
  // Nav tabs
  tabMirror: "Mirror",
  tabPerformance: "Performance",
  tabPreferences: "Preferences",
  // Performance panel
  performanceEyebrow: "SYSTEM & DEVICE",
  performanceTitle: "Performance",
  performanceSubtitle: "Dual real-time monitoring: Host PC and Android Phone RAM.",
  refreshButton: "Refresh",
  memoryInUse: "Memory in use",
  calculating: "Calculating…",
  processesByMemory: "PC processes by memory",
  processesVisible: "{count} visible",
  processNote: "Only your session's processes are listed. \"Close\" sends a normal termination signal, not a force-kill.",
  confirmClose: "Close \"{name}\" (PID {pid})? You may lose unsaved work.",
  closeProcessTitle: "Close {name}",
  closeButton: "Close",
  processNotOwned: "Process {pid} does not belong to the current user.",
  processNotFound: "Process {pid} not found.",
  terminateNotAvailable: "Process termination is only available on Linux.",
  performanceNotAvailable: "The performance panel is currently only available on Linux.",
  phoneMemoryTitle: "Phone Memory (Android RAM)",
  phoneMemoryDevice: "Device: {device}",
  phoneMemoryOptimal: "Optimal memory headroom for smooth gaming.",
  phoneMemoryWarning: "High phone memory usage (>80%). Close background apps to prevent stuttering.",
  phoneMemoryUnavailable: "Unable to read phone memory. Ensure USB debugging is authorized.",
  noDeviceSelectedForMemory: "No phone selected. Connect and select a device in the Mirror tab to monitor its RAM.",
  phoneMemoryImpactExplainer: "Tip: Phone RAM bottlenecks cause GC pauses, input lag, and frame drops. The PC only handles video decoding and input forwarding.",
  pcMemoryTitle: "Host PC Memory (RAM)",
  freeMemory: "{free} available",
  phoneGameBoost: "Game Boost (Phone Optimizer)",
  phoneGameBoostBtn: "Boost Phone RAM",
  phoneGameBoostDesc: "Terminate idle background tasks and purge caches on the Android device to maximize gaming FPS.",
  phoneGameBoostIdle: "No known background apps are safe to close. Your game and foreground app are left untouched.",
  phoneGameBoostResult: "Closed {count} background apps · {freed} newly available",
  phoneProcessesTitle: "Phone apps by memory use",
  phoneProcessesDesc: "Choose third-party background apps to close. Your game and keymapper are locked for protection.",
  phoneProcessAppColumn: "App",
  phoneProcessMemoryColumn: "Memory",
  phoneProcessStatusColumn: "Status",
  phoneProcessActionsColumn: "Actions",
  phoneProcessesSelected: "{count} selected",
  phoneProcessProtected: "Protected",
  phoneProcessSelect: "Selectable",
  phoneProcessesUnavailable: "No readable third-party running apps. Some Android vendors restrict per-process memory data.",
  phoneProcessesConfirm: "Close these selected background apps? {apps}",
  phoneGameBoostRunning: "Optimizing phone memory...",
  phoneGameBoostSuccess: "Game Boost complete! Phone memory freed.",
  phoneProcessTerminateConfirmTitle: "Close phone application",
  phoneProcessTerminateConfirm: "Are you sure you want to force-stop {name} (PID {pid}, {package}) on the phone?",
  phoneProcessSelectAll: "Select all optimizable",
  phoneProcessDeselectAll: "Deselect all",
  phoneProcessClosed: "App closed on phone: {name}",
  presetAppsTitle: "Heavy Background Phone Apps",
  presetAppsDesc: "Detect and force-stop RAM-heavy background apps (browsers, social media) on your phone.",
  killAllRunningPresets: "Close All Running Apps",
  killSelectedApp: "Stop App",
  appClosedNotice: "Force-stopped phone app: {name}",
  noPresetAppsDetected: "No preset heavy apps detected",
  appsRunningBadge: "{count} running",
  appsInstalledBadge: "{count} installed",
  // Preferences panel
  preferencesEyebrow: "PREFERENCES",
  preferencesTitle: "Preferences",
  preferencesSubtitle: "These preferences are saved on this machine and applied to the next mirror session.",
  shortcutModLabel: "Shortcut modifier key",
  shortcutModDescription: "scrcpy lets you change the MOD key, not the individual action bindings.",
  shortcutModUseAs: "Use as MOD",
  modAltOrSuper: "Left Alt or Left Super",
  modAlt: "Left Alt",
  modSuper: "Left Super",
  modCtrl: "Left Ctrl",
  requireActivationFirst: "Activate keymapper first to start mirroring",
  activationModalTitle: "Keymapper Activation",
  activationSubtitle: "Live injection console & security verification",
  tabLiveConsole: "Live Log",
  tabTransparency: "What does this script do? (Transparency)",
  activationStatusRunning: "Activating keymapper…",
  activationStatusSuccess: "Keymapper successfully activated!",
  activationStatusFailed: "Keymapper activation failed",
  startMirrorNow: "Start Mirror now",
  copyLogs: "Copy logs",
  logsCopied: "Copied!",
  close: "Close",
  retry: "Retry",
  keymapperActiveBadge: "Active",
  keymapperInactiveBadge: "Not Activated",
  transparencyBadge: "Transparency & Security",
  transparencyHeroDesc: "Aether Relay executes the official keymapper activation script without root access and without compromising device security.",
  transparencyPoint1Title: "1. Why is this script needed?",
  transparencyPoint1Desc: "For security, Android isolates apps and prevents standard apps from simulating PC keyboard and mouse input over games. The script grants required input injection permissions via ADB.",
  transparencyPoint2Title: "2. Zero Root & 100% Safe",
  transparencyPoint2Desc: "It leaves system partitions (/system) untouched and does not modify firmware. Your warranty, Knox, and SafetyNet / Play Integrity remain completely intact.",
  transparencyPoint3Title: "3. Temporary RAM Daemon",
  transparencyPoint3Desc: "The script runs a local daemon (inject_server or Shizuku) under Android's shell account. It lives solely in RAM and vanishes automatically on device reboot.",
  transparencyPoint4Title: "4. Total Control & 1-Click Stop",
  transparencyPoint4Desc: "You can stop all keymapper processes at any time using 'Deactivate Keymapper', instantly restoring your phone to its original clean state.",
  transparencyCommandsTitle: "Executed ADB Commands",
  transparencyCommandsDesc: "1. Launch mapper app (am monkey)\n2. Run official activation script (sh activate.sh)\n3. Verify daemon running status (ps)",
  stepAdb: "ADB Connection & Environment",
  stepDetect: "Keymapper Detection",
  stepLaunch: "App Launch on Android",
  stepInject: "Daemon Script Execution",
  stepVerify: "Service Verification",
  viewActivationLogs: "View logs & details",
  elapsedTime: "Elapsed",
  // Confirm modal & generic dialogs
  confirmAction: "Confirm Action",
  cancel: "Cancel",
  confirm: "Confirm",
  confirmCloseTitle: "Terminate System Process",
  terminateProcess: "Terminate Process",
  resetPreferencesConfirm: "Reset settings to defaults?",
  resetPreferencesDesc: "All video codecs, audio streaming, shortcuts, and appearance theme settings will return to defaults.",
  // Advanced preferences
  settingsCategoryInput: "Input & Keymapping",
  settingsCategoryVideo: "Video Engine & Display",
  settingsCategoryAudio: "Audio Engine & Latency",
  settingsCategoryAppearance: "Interface & Themes",
  videoCodecLabel: "Video Codec",
  videoCodecDesc: "H.264 for universal compatibility; H.265 (HEVC) for lower bandwidth & less latency; AV1 for modern hardware.",
  codecAuto: "Auto-detect (Recommended)",
  codecH264: "H.264 (AVC - Universal)",
  codecH265: "H.265 (HEVC - Low Latency)",
  codecAV1: "AV1 (Next-Gen Hardware)",
  videoBufferLabel: "Video Buffer",
  videoBufferDesc: "0 ms for ultra-low latency eSports mode; 50 ms for smooth buffering.",
  bufferZero: "0 ms (Ultra-low latency / Gaming)",
  bufferSmooth: "50 ms (Smooth & stable)",
  preferencesSavedNotice: "Preferences updated",
  audioCodecLabel: "Audio Codec",
  audioCodecDesc: "Opus offers optimal latency and sound fidelity in scrcpy.",
  audioCodecAuto: "Opus (Recommended)",
  audioCodecRaw: "RAW (Uncompressed PCM)",
  audioCodecFlac: "FLAC (Lossless)",
  audioBufferLabel: "Audio Buffer (ms)",
  audioBufferDesc: "Increase audio buffer if you hear crackling or pops under heavy network load.",
  audioBufferLow: "50 ms (Ultra-low latency)",
  audioBufferDefault: "100 ms (Default balanced)",
  audioBufferHigh: "200 ms (Smooth & stable)",
  themeAccentLabel: "Accent Color",
  themeAccentDesc: "Choose your favorite Aether accent color palette.",
  themeLime: "Aether Lime (Official)",
  themeCyan: "Cyber Cyan",
  themeViolet: "Stealth Violet",
  themePink: "Sakura Pink",
  themeAmber: "Solar Amber",
  languageLabel: "Interface Language",
  languageDesc: "Switch the application display language (EN / ES / ZH).",
  resetDefaults: "Reset to Recommended Defaults",
  keyRepeatTipTitle: "WASD Movement / Joystick Stutter?",
  keyRepeatTipDesc: "Holding 'W' causing character stutter is due to OS key-repeat. Lower key repeat in OS settings or run 'xset r off' to fix it.",
  updatesCategory: "Software Updates",
  checkForUpdates: "Check for Updates",
  checkingForUpdates: "Checking for updates...",
  appUpToDate: "Aether Relay is up to date (v{version})",
  updateAvailable: "New version v{version} available!",
  downloadAndInstall: "Download & Install Now",
  downloadingUpdate: "Downloading update...",
  updateInstalledRestart: "Update installed successfully. Restarting...",
  updateCheckFailed: "Could not check for updates. Try again later.",
  checkForUpdatesDesc: "Check if newer versions of Aether Relay are available on GitHub Releases.",
  tabDiagnostics: "Diagnostics",
  diagnosticsEyebrow: "Session Telemetry & Troubleshooting",
  diagnosticsTitle: "Session Diagnostics & Stutter Toolkit",
  diagnosticsSubtitle: "Low-overhead live monitoring of USB link, ADB latency, thermal pressure, and scrcpy pipeline to isolate lag and stutter causes.",
  adbLatencyTitle: "ADB Command Latency",
  adbLatencySubtitle: "Round-trip execution to device (not display presentation latency)",
  baselineLatency: "Baseline",
  captureFpsTitle: "Capture Frame Rate",
  captureFpsSubtitle: "Android hardware encoder capture rate (not display refresh)",
  batteryTempTitle: "Battery Temperature",
  thermalStatusTitle: "Thermal Pressure",
  usbLinkSpeedTitle: "USB Link Negotiation",
  usbLinkSubtitle: "Read directly via Linux sysfs",
  reconnectCountTitle: "Reconnections",
  activeEncoderTitle: "Hardware Encoder",
  activeDecoderTitle: "Decoder & Display",
  markStutterButton: "Mark Stutter / Incident",
  markStutterTip: "Bookmark stutter capturing -60s prior and +30s following sample window",
  stutterMarkedNotice: "Stutter incident marked (collecting +30s window)",
  bookmarksTitle: "Recorded Stutter Incidents",
  noBookmarksYet: "No stutter incidents bookmarked in this session yet.",
  bookmarkStateCollecting: "Collecting window (+30s)",
  bookmarkStateComplete: "Complete window",
  bookmarkStateInterrupted: "Interrupted by session stop",
  exportDiagnosticsButton: "Export Diagnostics (JSON)",
  exportSuccess: "Diagnostics report exported and copied to clipboard",
  scrcpyLogsTitle: "scrcpy Real-Time Console (stdout + stderr)",
  filterAll: "All",
  filterWarnings: "Warnings & Errors",
  filterEncoder: "Pipeline / Codec",
  clearLogs: "Clear View",
  logsEmpty: "No logs captured yet. Start mirror to stream real-time events.",
  baselinePresetTitle: "Controlled Test Baseline",
  baselinePresetDesc: "Applies 1920px max, 60 FPS, H.264, 8 Mbps, Audio OFF, Buffer 0ms to isolate streaming variables.",
  applyBaselineButton: "Apply Baseline Preset",
  baselineApplied: "8 Mbps H.264 Baseline preset applied",
  forceWaylandOption: "Force Native Wayland (SDL_VIDEODRIVER=wayland)",
  forceWaylandDesc: "Bypasses XWayland on Linux / Hyprland to test if vsync pacing improves.",
  videoBufferOption: "Video Jitter Buffer",
  videoBufferJitterDesc: "Default is 0 ms for lowest latency; test 10 ms or 20 ms to absorb USB packet jitter.",
  guideTitle: "Root-Cause Isolator: Video Lag vs Input Backpressure",
  guideStep1Title: "Test 1: Physical Touch vs WASD Input",
  guideStep1Desc: "When latency appears, tap your phone directly. If the phone reacts instantly while the monitor delays, the issue is Video/Render. If the phone itself reacts late to WASD, the bottleneck is UHID / Mapper queue.",
  guideStep2Title: "Test 2: USB Negotiation & Port Health",
  guideStep2Desc: "Verify if USB Speed is 480 Mbps. If degraded to 12 Mbps, cable or port dropped to USB 1.1.",
  guideStep3Title: "Test 3: Thermal Pressure Correlation",
  guideStep3Desc: "If smooth initially and stutters above 42°C, but reconnecting cable immediately restores smoothness while phone remains hot, state/queue accumulation is the primary culprit.",
};

const es: Record<keyof typeof zh, string> = {
  appTitle: "Aether Relay",
  appDescriptionBefore: "Transmite la pantalla de tu Android con",
  appDescriptionAfter: " y juega con teclado y ratón en tu PC.",
  selectDevice: "Seleccionar dispositivo",
  refresh: "Actualizar",
  connectionHelp: "Ayuda de conexión",
  closeHelp: "Cerrar ayuda",
  connectDeviceTitle: "Cómo conectar tu dispositivo Android",
  connectDeviceStep1: "Abre Ajustes > Acerca del teléfono y pulsa 'Número de compilación' 7 veces para activar las Opciones de desarrollador.",
  connectDeviceStep2: "Entra en Opciones de desarrollador y activa la 'Depuración por USB'.",
  connectDeviceStep3: "Conecta tu móvil desbloqueado con un cable USB compatible con transferencia de datos.",
  connectDeviceStep4: "Cuando aparezca el aviso en el móvil, pulsa 'Permitir siempre desde este ordenador'.",
  connectDeviceTip: "El dispositivo aparecerá automáticamente o pulsando Actualizar. Los nombres pueden variar según la marca del móvil.",
  waitingDevice: "Esperando dispositivo USB o inalámbrico",
  enableUsbDebugging: "Activa la depuración por USB y autoriza este ordenador",
  connected: "Conectado",
  unauthorized: "No autorizado",
  unavailable: "No encontrado",
  available: "Disponible",
  mirrorSettings: "Ajustes de transmisión",
  recommended: "Recomendado",
  maxResolution: "Resolución máxima",
  maxFps: "FPS máximos",
  videoBitrate: "Bitrate de vídeo",
  selectKeymapper: "Mapeador objetivo",
  autoDetect: "Auto-detectar (Recomendado)",
  ggMousePro: "GG Mouse Pro",
  pandaMousePro: "Panda Mouse Pro",
  pandaGamepadPro: "Panda Gamepad Pro",
  pandaTouchPro: "Panda Touch Pro",
  audioForwarding: "Transmitir audio",
  stayAwake: "Mantener pantalla activa",
  startFullscreen: "Iniciar en pantalla completa",
  alwaysOnTop: "Ventana siempre visible",
  launchPmp: "Abrir el mapeador seleccionado al iniciar espejo",
  turnScreenOff: "Apagar la pantalla del móvil al iniciar",
  mappingMode: "Modo Mapeo Teclado y Ratón",
  mappingDescription: "Usa -K -M y --mouse-bind=++++:++++ enviando todos los clics y teclas como hardware físico.",
  enabledByDefault: "Activo por defecto",
  virtualDisplayUnavailable: "Modo Pantalla Independiente",
  virtualDisplayDescription: "Juega en el PC mientras usas el móvil normalmente. Requiere Android 10 o superior.",
  experimental: "EXPERIMENTAL",
  shortcuts: "Atajos de teclado",
  modDescription: "MOD = Alt Izquierdo o Tecla Super / Command",
  releaseMouse: "Capturar / Liberar ratón",
  toggleFullscreen: "Alternar pantalla completa",
  quitMirror: "Salir del espejo",
  togglePhoneScreen: "Encender / Apagar pantalla del móvil",
  goHome: "Ir al inicio",
  goBack: "Atrás",
  recentTasks: "Apps recientes",
  rotateScreen: "Rotar pantalla",
  adjustVolume: "Ajustar volumen",
  pasteClipboard: "Pegar portapapeles",
  keyboardSettings: "Ajustes de teclado físico",
  toggleFps: "Mostrar / Ocultar FPS",
  shortcutNote: "En Linux/Windows pulsa Alt Izquierdo para liberar o capturar el cursor del ratón en cualquier momento.",
  startMirror: "Iniciar Espejo",
  startIndependentDisplay: "Iniciar Pantalla Independiente",
  stopMirror: "Detener Espejo",
  activateApps: "Activar Mapeador",
  activatingApps: "Iniciando y activando el mapeador…",
  activationCommandCompleted: "Comando de activación ejecutado para {app}",
  deactivateApps: "Desactivar Mapeador",
  deactivatingApps: "Deteniendo mapeadores y servicios en segundo plano…",
  deactivationCompleted: "Procesos y servicios del mapeador detenidos correctamente",
  checkingEnvironment: "Comprobando entorno…",
  devicesFound: "Se encontraron {count} dispositivo(s) disponible(s)",
  noDevices: "No se encontraron dispositivos Android autorizados",
  mirrorStarted: "Espejo iniciado · PID {pid}",
  mirrorStopped: "Espejo detenido",
  mirrorWindowExited: "La ventana del espejo se cerró",
  officialWebsite: "Sitio web oficial",
  adbMissing: "No se encontró adb. Por favor, reinstala la aplicación.",
  adbRunFailed: "Error al ejecutar adb: {detail}",
  launchAppFailed: "No se pudo abrir la app de mapeo: {detail}",
  activateAppFailed: "Error al activar el mapeador: {detail}",
  deactivateAppFailed: "Error al detener procesos del mapeador: {detail}",
  supportedAppMissing: "No se encontró instalado GG Mouse Pro ni Panda Mouse Pro.",
  selectDeviceError: "Por favor, selecciona un dispositivo primero.",
  virtualDisplayError: "La pantalla independiente requiere Android 10 o superior: {detail}",
  scrcpyMissing: "No se encontró scrcpy.",
  processUnavailable: "El estado del proceso no está disponible.",
  mirrorAlreadyRunning: "El espejo ya se encuentra en ejecución.",
  startFailed: "Error al iniciar scrcpy: {detail}",
  stopFailed: "Error al detener scrcpy: {detail}",
  mirrorGuide: "Qué significa cada ajuste",
  guideResolution: "Resolución",
  guideResolutionDescription: "Un límite mayor se ve más nítido, pero aumenta el trabajo de codificación y transferencia.",
  guideBitrate: "Bitrate de vídeo",
  guideBitrateDescription: "Más bitrate conserva más detalle; por USB usa 12–24 Mbps y redúcelo si la red es débil.",
  guideFps: "FPS máximos",
  guideFpsDescription: "Es un límite de captura: no crea fotogramas que el móvil o el juego no produzcan.",
  guideLatency: "Retraso",
  guideLatencyDescription: "Lo determinan codificación, USB/Wi‑Fi y decodificación del PC; bajar resolución y bitrate suele ayudar más.",
  // Nav tabs
  tabMirror: "Espejo",
  tabPerformance: "Rendimiento",
  tabPreferences: "Configuración",
  // Performance panel
  performanceEyebrow: "SISTEMA Y DISPOSITIVO",
  performanceTitle: "Rendimiento",
  performanceSubtitle: "Monitoreo dual en tiempo real: RAM del PC anfitrión y del celular Android.",
  refreshButton: "Actualizar",
  memoryInUse: "Memoria en uso",
  calculating: "Calculando…",
  processesByMemory: "Procesos del PC por memoria",
  processesVisible: "{count} visibles",
  processNote: "Sólo se listan procesos de tu sesión. \"Cerrar\" envía una terminación normal, no forzada.",
  confirmClose: "¿Cerrar \"{name}\" (PID {pid})? Podrías perder trabajo sin guardar.",
  closeProcessTitle: "Cerrar {name}",
  closeButton: "Cerrar",
  processNotOwned: "El proceso {pid} no pertenece al usuario actual.",
  processNotFound: "Proceso {pid} no encontrado.",
  terminateNotAvailable: "La terminación de procesos solo está disponible en Linux.",
  performanceNotAvailable: "El panel de rendimiento está disponible actualmente en Linux.",
  phoneMemoryTitle: "RAM del Celular (Android)",
  phoneMemoryDevice: "Dispositivo: {device}",
  phoneMemoryOptimal: "Memoria óptima para jugar sin tirones ni caídas de FPS.",
  phoneMemoryWarning: "Uso de memoria alto en el móvil (>80%). Cierra apps en segundo plano para evitar tirones.",
  phoneMemoryUnavailable: "No se pudo leer la memoria del celular. Verifica la depuración USB.",
  noDeviceSelectedForMemory: "No hay celular seleccionado. Conecta uno en la pestaña Espejo para ver su RAM.",
  phoneMemoryImpactExplainer: "Nota: La saturación de RAM en el celular es la causa principal de tirones y lag al jugar. El PC solo decodifica vídeo y envía teclas.",
  pcMemoryTitle: "RAM del PC (Host)",
  freeMemory: "{free} disponible",
  phoneGameBoost: "Game Boost (Optimizador Celular)",
  phoneGameBoostBtn: "Liberar RAM Celular",
  phoneGameBoostDesc: "Cierra procesos inactivos y purga cachés en segundo plano en Android para evitar caídas de FPS.",
  phoneGameBoostIdle: "No hay apps conocidas que se puedan cerrar con seguridad. Tu juego y la app en primer plano no se tocan.",
  phoneGameBoostResult: "Cerradas {count} apps en segundo plano · {freed} liberados",
  phoneProcessesTitle: "Apps del celular por consumo de RAM",
  phoneProcessesDesc: "Elige qué apps de terceros cerrar. Tu juego y los mappers están bloqueados por protección.",
  phoneProcessAppColumn: "App",
  phoneProcessMemoryColumn: "RAM",
  phoneProcessStatusColumn: "Estado",
  phoneProcessActionsColumn: "Acciones",
  phoneProcessesSelected: "{count} seleccionadas",
  phoneProcessProtected: "Protegida",
  phoneProcessSelect: "Seleccionable",
  phoneProcessesUnavailable: "No hay apps de terceros activas que se puedan leer; algunos fabricantes restringen la RAM por proceso.",
  phoneProcessesConfirm: "¿Cerrar estas apps en segundo plano seleccionadas? {apps}",
  phoneGameBoostRunning: "Optimizando memoria del celular...",
  phoneGameBoostSuccess: "¡Game Boost completado! Memoria RAM liberada.",
  phoneProcessTerminateConfirmTitle: "Cerrar app del teléfono",
  phoneProcessTerminateConfirm: "¿Estás seguro de que deseas forzar el cierre de {name} (PID {pid}, {package}) en el teléfono?",
  phoneProcessSelectAll: "Seleccionar optimizables",
  phoneProcessDeselectAll: "Deseleccionar todo",
  phoneProcessClosed: "App cerrada en el teléfono: {name}",
  presetAppsTitle: "Apps Pesadas en Segundo Plano",
  presetAppsDesc: "Detecta y fuerza el cierre de navegadores y redes sociales que saturan la RAM de tu teléfono.",
  killAllRunningPresets: "Cerrar todas las activas",
  killSelectedApp: "Detener app",
  appClosedNotice: "App detenida en el teléfono: {name}",
  noPresetAppsDetected: "No se detectaron apps pesadas instaladas",
  appsRunningBadge: "{count} activas",
  appsInstalledBadge: "{count} instaladas",
  // Preferences panel
  preferencesEyebrow: "PREFERENCIAS",
  preferencesTitle: "Configuración",
  preferencesSubtitle: "Estas preferencias se guardan en este equipo y se aplican al siguiente espejo.",
  shortcutModLabel: "Modificador de atajos",
  shortcutModDescription: "scrcpy permite cambiar la tecla MOD, no las combinaciones de cada acción.",
  shortcutModUseAs: "Usar como MOD",
  modAltOrSuper: "Alt izquierdo o Super izquierdo",
  modAlt: "Alt izquierdo",
  modSuper: "Super izquierdo",
  modCtrl: "Ctrl izquierdo",
  requireActivationFirst: "Activa el mapeador primero para poder iniciar el espejo",
  activationModalTitle: "Activación del Mapeador",
  activationSubtitle: "Consola de inyección en vivo y verificación de seguridad",
  tabLiveConsole: "Registro en Vivo",
  tabTransparency: "¿Qué hace este script? (Transparencia)",
  activationStatusRunning: "Ejecutando activación…",
  activationStatusSuccess: "¡Mapeador activado correctamente!",
  activationStatusFailed: "Fallo durante la activación",
  startMirrorNow: "Iniciar Espejo ahora",
  copyLogs: "Copiar registro",
  logsCopied: "¡Copiado!",
  close: "Cerrar",
  retry: "Reintentar",
  keymapperActiveBadge: "Mapeador Activo",
  keymapperInactiveBadge: "No Activado",
  transparencyBadge: "Transparencia y Seguridad",
  transparencyHeroDesc: "Aether Relay ejecuta el script oficial de activación del mapeador sin necesidad de root y sin comprometer la seguridad de tu dispositivo.",
  transparencyPoint1Title: "1. ¿Por qué se necesita este script?",
  transparencyPoint1Desc: "Por motivos de seguridad, Android aísla aplicaciones y prohíbe que una app simule eventos de hardware (teclado y ratón de tu PC) sobre juegos. El script otorga los permisos necesarios mediante el puente ADB oficial.",
  transparencyPoint2Title: "2. Cero Root y 100% Seguro",
  transparencyPoint2Desc: "No modifica la partición de sistema (/system), no desbloquea el bootloader y no altera el firmware. La garantía de tu móvil, Knox y SafetyNet/Play Integrity permanecen intactos.",
  transparencyPoint3Title: "3. Servidor Daemon Temporal en RAM",
  transparencyPoint3Desc: "El script inicia un proceso local (inject_server o servicio Shizuku) ejecutado con permisos de usuario shell de Android. Solo reside en la memoria RAM y desaparece automáticamente al reiniciar el teléfono.",
  transparencyPoint4Title: "4. Control Total y Desactivación en 1 Clic",
  transparencyPoint4Desc: "Puedes terminar todos los procesos y scripts en cualquier momento pulsando 'Desactivar Mapeador', devolviendo tu teléfono a su estado original al instante.",
  transparencyCommandsTitle: "Comandos ADB que se ejecutan",
  transparencyCommandsDesc: "1. Inicia la app mapeadora (am monkey)\n2. Ejecuta el script oficial del mapeador (sh activate.sh)\n3. Confirma el daemon en ejecución (ps)",
  stepAdb: "Conexión y entorno ADB",
  stepDetect: "Detección del Mapeador",
  stepLaunch: "Inicialización de la App",
  stepInject: "Ejecución de script daemon",
  stepVerify: "Verificación de servicio",
  viewActivationLogs: "Ver registro / Detalles",
  elapsedTime: "Tiempo",
  // Confirm modal & generic dialogs
  confirmAction: "Confirmar acción",
  cancel: "Cancelar",
  confirm: "Confirmar",
  confirmCloseTitle: "Terminar proceso del sistema",
  terminateProcess: "Terminar proceso",
  resetPreferencesConfirm: "¿Restablecer configuración a valores predeterminados?",
  resetPreferencesDesc: "Todos los códecs de vídeo, ajustes de audio, atajos y el tema visual volverán a los valores recomendados.",
  // Advanced preferences
  settingsCategoryInput: "Entrada y Mapeo de Teclas",
  settingsCategoryVideo: "Motor de Vídeo y Pantalla",
  settingsCategoryAudio: "Motor de Audio y Latencia",
  settingsCategoryAppearance: "Interfaz y Temas",
  videoCodecLabel: "Códec de vídeo",
  videoCodecDesc: "H.264 para compatibilidad universal; H.265 (HEVC) para menor consumo de ancho de banda y menor lag; AV1 para hardware moderno.",
  codecAuto: "Automático (Recomendado)",
  codecH264: "H.264 (AVC - Universal)",
  codecH265: "H.265 (HEVC - Baja latencia)",
  codecAV1: "AV1 (Hardware moderno)",
  videoBufferLabel: "Búfer de vídeo",
  videoBufferDesc: "0 ms para ultra baja latencia en juegos; 50 ms para reproducción fluida.",
  bufferZero: "0 ms (Ultra baja latencia / Gaming)",
  bufferSmooth: "50 ms (Fluido y estable)",
  preferencesSavedNotice: "Configuración actualizada",
  audioCodecLabel: "Códec de audio",
  audioCodecDesc: "Opus ofrece la mejor fidelidad de sonido y latencia mínima en scrcpy.",
  audioCodecAuto: "Opus (Recomendado)",
  audioCodecRaw: "RAW (Sin compresión)",
  audioCodecFlac: "FLAC (Sin pérdida)",
  audioBufferLabel: "Búfer de audio (ms)",
  audioBufferDesc: "Aumenta el búfer si notas cortes o chasquidos en el sonido bajo carga.",
  audioBufferLow: "50 ms (Ultra baja latencia)",
  audioBufferDefault: "100 ms (Equilibrado / Por defecto)",
  audioBufferHigh: "200 ms (Fluido y sin cortes)",
  themeAccentLabel: "Color de acento",
  themeAccentDesc: "Elige tu paleta de acento favorita al estilo Aether.",
  themeLime: "Aether Lime (Oficial)",
  themeCyan: "Cyber Cyan (Cian)",
  themeViolet: "Stealth Violet (Violeta)",
  themePink: "Sakura Pink (Rosa)",
  themeAmber: "Solar Amber (Ámbar)",
  languageLabel: "Idioma de la interfaz",
  languageDesc: "Cambia el idioma visual de la aplicación.",
  resetDefaults: "Restablecer valores predeterminados",
  keyRepeatTipTitle: "¿Tirones en el joystick o al pulsar WASD?",
  keyRepeatTipDesc: "Si el personaje tiembla al mantener pulsada la 'W', se debe a la repetición de teclas del sistema operativo. Desactiva la repetición o usa 'xset r off' para solucionarlo.",
  updatesCategory: "Actualizaciones de software",
  checkForUpdates: "Buscar actualizaciones",
  checkingForUpdates: "Buscando actualizaciones...",
  appUpToDate: "Aether Relay está actualizado (v{version})",
  updateAvailable: "¡Nueva versión v{version} disponible!",
  downloadAndInstall: "Descargar e instalar ahora",
  downloadingUpdate: "Descargando actualización...",
  updateInstalledRestart: "Actualización instalada con éxito. Reiniciando...",
  updateCheckFailed: "No se pudo comprobar actualizaciones. Inténtalo más tarde.",
  checkForUpdatesDesc: "Comprueba si hay nuevas versiones de Aether Relay disponibles en GitHub Releases.",
  tabDiagnostics: "Diagnóstico",
  diagnosticsEyebrow: "Telemetría de Sesión y Diagnóstico",
  diagnosticsTitle: "Diagnóstico de Sesión y Tirones",
  diagnosticsSubtitle: "Monitorea a bajo coste velocidad USB, latencia ADB, presión térmica y logs scrcpy para aislar la causa del lag.",
  adbLatencyTitle: "Latencia de Comandos ADB",
  adbLatencySubtitle: "Tiempo de ida y vuelta al dispositivo (no mide latencia de presentación)",
  baselineLatency: "Línea base",
  captureFpsTitle: "Tasa de Captura",
  captureFpsSubtitle: "Tasa de captura del encoder Android (no mide latencia en monitor)",
  batteryTempTitle: "Temperatura de Batería",
  thermalStatusTitle: "Presión Térmica",
  usbLinkSpeedTitle: "Velocidad de Enlace USB",
  usbLinkSubtitle: "Lectura directa vía sysfs en Linux",
  reconnectCountTitle: "Reconexiones",
  activeEncoderTitle: "Encoder de Hardware",
  activeDecoderTitle: "Decodificador y Pantalla",
  markStutterButton: "Marcar Tirón / Stutter",
  markStutterTip: "Guarda un bookmark con las muestras de los 60s previos y 30s posteriores al incidente",
  stutterMarkedNotice: "Tirón registrado con éxito (recopilando ventana de 30s posteriores)",
  bookmarksTitle: "Incidentes de Tirones Registrados",
  noBookmarksYet: "No se han marcado tirones en esta sesión todavía.",
  bookmarkStateCollecting: "Recopilando ventana (+30s)",
  bookmarkStateComplete: "Ventana completa",
  bookmarkStateInterrupted: "Interrumpido al cerrar sesión",
  exportDiagnosticsButton: "Exportar Diagnóstico (JSON)",
  exportSuccess: "Reporte de diagnóstico exportado y copiado al portapapeles",
  scrcpyLogsTitle: "Consola en Tiempo Real scrcpy (stdout + stderr)",
  filterAll: "Todos",
  filterWarnings: "Avisos y Errores",
  filterEncoder: "Pipeline / Códec",
  clearLogs: "Limpiar Vista",
  logsEmpty: "Sin logs todavía. Inicia el espejo para ver los eventos en vivo.",
  baselinePresetTitle: "Preset de Control Baseline",
  baselinePresetDesc: "Aplica 1920px max, 60 FPS, H.264, 8 Mbps, Audio OFF y Buffer 0ms para aislar variables.",
  applyBaselineButton: "Aplicar Preset de Control",
  baselineApplied: "Preset de control 8 Mbps H.264 aplicado",
  forceWaylandOption: "Forzar Wayland Nativo (SDL_VIDEODRIVER=wayland)",
  forceWaylandDesc: "Bypasa XWayland en Linux / Hyprland para comprobar si elimina micro-tirones de pacing.",
  videoBufferOption: "Buffer de Jitter de Video",
  videoBufferJitterDesc: "Default es 0 ms para menor latencia; prueba 10 ms o 20 ms para absorber jitter USB.",
  guideTitle: "Guía de Aislamiento: ¿Delay de Video o Cola de Input?",
  guideStep1Title: "Prueba 1: Toque Físico vs WASD",
  guideStep1Desc: "Cuando sientas delay, toca la pantalla del teléfono. Si el teléfono reacciona al instante pero el monitor va tarde, está en Video/Render. Si en el teléfono WASD también va tarde, está en la cola UHID / Mapper.",
  guideStep2Title: "Prueba 2: Negociación USB y Puerto",
  guideStep2Desc: "Verifica que marque 480 Mbps. Si cae a 12 Mbps, el cable o puerto degradó la conexión a USB 1.1.",
  guideStep3Title: "Prueba 3: Correlación con Temperatura",
  guideStep3Desc: "Si empieza bien y empeora a más de 42°C, pero reconectar el cable restaura la fluidez de inmediato estando caliente, la causa principal es acumulación de colas y no thermal throttling puro.",
};

export type MessageKey = keyof typeof zh;
const dictionaries = { "zh-CN": zh, en, es };

export function detectLocale(): Locale {
  const saved = localStorage.getItem("panda-locale");
  if (saved === "zh-CN" || saved === "en" || saved === "es") return saved;
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("es")) return "es";
  if (nav.startsWith("zh")) return "zh-CN";
  return "en";
}

export function translate(locale: Locale, key: MessageKey, values: Record<string, string | number> = {}) {
  const dict = dictionaries[locale] ?? dictionaries.es;
  const text = dict[key] ?? dictionaries.en[key] ?? key;
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    text
  );
}

export function localizeBackendError(locale: Locale, error: unknown) {
  const raw = String(error);
  const exact: Record<string, MessageKey> = {
    "未找到 adb，请重新安装 Aether Relay": "adbMissing",
    "请先选择设备": "selectDeviceError",
    "未安装受支持的 Panda 映射 App": "supportedAppMissing",
    "未安装受支持的映射 App (GG Mouse Pro / Panda)": "supportedAppMissing",
    "未找到 scrcpy，请重新安装 Aether Relay": "scrcpyMissing",
    "镜像进程状态不可用": "processUnavailable",
    "镜像已经在运行": "mirrorAlreadyRunning",
    "The performance panel is currently only available on Linux.": "performanceNotAvailable",
    "Process termination is only available on Linux.": "terminateNotAvailable",
  };
  if (exact[raw]) return translate(locale, exact[raw]);
  const prefixes: Array<[string, MessageKey]> = [
    ["无法运行 adb: ", "adbRunFailed"],
    ["无法启动映射 App: ", "launchAppFailed"],
    ["Panda App 激活失败: ", "activateAppFailed"],
    ["映射 App 激活失败: ", "activateAppFailed"],
    ["App 激活失败: ", "activateAppFailed"],
    ["停止映射进程失败: ", "deactivateAppFailed"],
    ["独立投屏需要 Android 10 或更高版本: ", "virtualDisplayError"],
    ["启动 scrcpy 失败: ", "startFailed"],
    ["停止 scrcpy 失败: ", "stopFailed"]
  ];
  const match = prefixes.find(([prefix]) => raw.startsWith(prefix));
  return match ? translate(locale, match[1], { detail: raw.slice(match[0].length) }) : raw;
}
