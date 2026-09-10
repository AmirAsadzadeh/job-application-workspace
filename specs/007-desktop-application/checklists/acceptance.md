# Desktop Application Acceptance

**Date**: 2026-09-09
**Host**: Windows Enterprise 25H2, build 26200.9168, x64
**Result**: Host acceptance passed; clean Windows 10 and Windows 11 environment verification remains pending as T030.

## Build And Automated Checks

- [x] `npm test -- --run`: 28 files, 164 tests passed.
- [x] `npm run test:performance`: 2 files, 4 tests passed.
- [x] `npm run build`: TypeScript and Vite production build passed.
- [x] `npm run tauri:test`: 2 Rust tests passed; main and documentation tests passed.
- [x] `npm run tauri:check`: native compile check passed.
- [x] `npm run build:sidecar`: Windows x64 Node single-executable sidecar built and served `/api/positions` with HTTP 200.
- [x] `npm run tauri:build`: unsigned per-user NSIS installer built successfully.

## Installed Application

- [x] Silent per-user installation completed in under 6 seconds, below the three-minute target.
- [x] Installed app and sidecar launched without `npm start` or a browser address.
- [x] First measured usable endpoint was ready in 1,476 ms, below the five-second target.
- [x] A second launch left exactly one application process running.
- [x] A missing-sidecar failure injection left the desktop shell alive and responsive in recovery mode.
- [x] Twenty automated launch/close cycles passed; every close was graceful and every sidecar stopped.
- [x] Reinstalling the final package preserved the hashes of both workspace JSON files.
- [x] Per-user JSON files were initialized at `%LOCALAPPDATA%\com.amirasadzadeh.job-application-workspace\workspace\`.
- [x] Existing HTTP, persistence, ZIP migration, resume, question, reading, sorting, native-dialog, folder, and external-link behaviors passed automated coverage.
- [x] Invalid/future JSON preservation and write-failure handling passed automated coverage without replacing the affected canonical file.

## Package Privacy

- [x] Installed payload contains only the application executable, sidecar executable, uninstaller, compiled frontend, empty positions template, reference-data template, and placeholder logo README.
- [x] Empty positions template contains no position records.
- [x] No runtime `positions.json`, resumes, uploaded logos, backups, workspace-transfer files, mocks, tests, caches, or development server files are included.
- [x] Generated binaries, installer output, resource staging, and schema caches are excluded from Git.

## Release Artifact

- **Installer**: `src-tauri/target/release/bundle/nsis/Job Application Workspace_0.1.0_x64-setup.exe`
- **Size**: 26,116,617 bytes
- **SHA-256**: `BD01469EB37D1CDEF6EB26182B486A86A3B1FB95808DFF1718E0FF07537E4911`

## Pending Compatibility Matrix

- [ ] Clean Windows 10 x64 install and launch.
- [ ] Clean Windows 11 x64 install and launch.
