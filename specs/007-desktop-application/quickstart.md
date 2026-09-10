# Quickstart: Validate the Desktop Application

## Build Prerequisites

- Windows 10 or Windows 11 on x64 hardware
- Node.js 24 and npm
- Rust stable with the `x86_64-pc-windows-msvc` target
- Microsoft Visual Studio C++ Build Tools with Desktop development with C++
- Microsoft Edge WebView2 runtime

Verified development environment: Node.js 24.14.0, npm 11.9.0, Rust 1.98.1 MSVC, Visual Studio Build Tools 2022 17.14.40 with C/C++ compiler 19.44.35228 for x64, and WebView2 152.0.4191.66. The project scripts load the MSVC environment automatically.

## Development Validation

```powershell
npm install
npm run tauri:dev
```

Expected result: one native application window opens, no separate browser navigation is required, and a second launch focuses the first instance.

## Automated Verification

```powershell
npm test
npm run test:performance
npm run tauri:test
npm run build
```

Expected result: existing web/server behavior remains green and desktop lifecycle tests pass.

## Installer Build

```powershell
npm run tauri:build
```

Expected output:

```text
src-tauri/target/release/bundle/nsis/*-setup.exe
```

The generated installer directory is build output and must remain excluded from Git.

## End-to-End Acceptance

1. Export the current source-run workspace to a ZIP package.
2. Install the generated setup executable for the current Windows user.
3. Launch the application from the Start menu without opening a terminal.
4. Confirm an empty workspace opens in under five seconds.
5. Import the ZIP and verify position records, questions, reading items, resume, logos, ordering, and preferences.
6. Create and update a position, close the application, and repeat launch/close 20 times; confirm data remains unchanged.
7. Use the data-folder action and confirm Explorer opens `%LOCALAPPDATA%/com.amirasadzadeh.job-application-workspace/workspace/`.
8. Open a job link and confirm it opens in the default browser.
9. Re-run the installer and confirm all workspace data remains.
10. Uninstall and reinstall; confirm the workspace data was not silently deleted.

## Package Inspection

Inspect the generated installer and installed resources. They must not contain `data/positions.json`, user resumes, uploaded logos, backups, mock records, test fixtures, development servers, or cache directories.
