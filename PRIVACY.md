# Privacy Policy

Aether Relay does not collect analytics, create user accounts, show
advertising, or transmit personal data to any third-party service.

The application communicates with Android devices selected by the user through
ADB, over USB or a wireless ADB connection configured by the user. Screen,
audio, keyboard, mouse, and device-control data are exchanged directly between
the computer and the selected Android device by adb and scrcpy. Aether Relay
does not relay this data through an external server.

The application opens external web pages only after an explicit user action.
It currently links to the scrcpy project page on GitHub.

Release builds include adb and scrcpy. The build process downloads their
official release archive from GitHub and verifies a pinned SHA-256 checksum;
this download occurs while building the application, not while an end user is
running it.

Third-party keymapper apps (GG Mouse Pro, Panda Mouse Pro, etc.) run
independently on the connected Android device and are subject to their own
privacy practices.

Questions about this policy may be submitted through the project's
[GitHub issue tracker](https://github.com/zsnow/AetherRelay/issues).
