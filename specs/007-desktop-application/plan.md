# Implementation Plan: Desktop Application

**Branch**: `007-desktop-application` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-desktop-application/spec.md`

## Summary

Package the existing workspace as a Tauri 2 desktop application for 64-bit Windows. Keep the tested TypeScript HTTP server and repository as a self-contained Node sidecar instead of rewriting storage behavior. The Tauri shell owns installation, single-instance behavior, backend lifecycle, native external-link and folder-opening actions, and the application window. The sidecar serves the existing production frontend and API on an ephemeral loopback port and stores private data beneath the current user's application-local data directory.

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Node.js 24 LTS, Rust stable (minimum 1.77.2)

**Primary Dependencies**: Tauri 2, Tauri CLI 2, Tauri shell/opener/single-instance plugins, Vite 7, Zod 4, Node single-executable application tooling, esbuild

**Storage**: Human-readable JSON and associated resume/logo/backup files under `%LOCALAPPDATA%/com.amirasadzadeh.job-application-workspace/workspace/`

**Testing**: Vitest 5 for existing frontend/server behavior, Rust unit tests for desktop lifecycle helpers, packaged-application smoke tests on Windows 10/11, manual installer and persistence validation

**Target Platform**: 64-bit Windows 10 and Windows 11 using Microsoft Edge WebView2

**Project Type**: Existing React/local-server application with a new Tauri desktop shell and bundled backend sidecar

**Performance Goals**: Usable first screen within five seconds; sidecar readiness within three seconds; current 1,000-position list targets remain unchanged

**Constraints**: Offline-capable; no browser local storage; no terminal required at runtime; no private data in installers; preserve existing API behavior; sidecar accessible only over loopback; unsigned first release; per-user installation without administrator access

**Scale/Scope**: One user, one application instance, one primary window, one local workspace, one Windows x64 NSIS installer

## Constitution Check

*GATE: Passed before research and re-checked after design.*

- **Specifications are the source of truth**: PASS. The approved specification defines packaging, persistence, migration, and platform boundaries.
- **Explicit approval gates**: PASS. This plan follows explicit specification approval; tasks and implementation remain unapproved.
- **Small, testable user journeys**: PASS. The feature contains one independently testable desktop launch-and-use journey.
- **Quiet, scannable UX**: PASS. Existing UI remains unchanged except for a compact native action to reveal the data folder and desktop-specific error recovery.
- **Local, human-readable data**: PASS. Existing JSON/file storage remains canonical and moves to a writable per-user data directory. ZIP import is the explicit migration path.
- **Existing architecture and limited scope**: PASS. The sidecar retains the current server, schemas, repository, transfer logic, and tests. No domain rewrite or unrelated UI work is proposed.
- **Privacy and repository hygiene**: PASS. Runtime data and generated installers remain ignored and are excluded from packaged resources.

## Project Structure

### Documentation (this feature)

```text
specs/007-desktop-application/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── desktop-lifecycle.md
│   └── sidecar-runtime.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── app/
└── features/positions/
    ├── components/
    └── positionApi.ts

server/
├── index.ts
├── positionsRepository.ts
├── resumeStorage.ts
├── workspacePackage.ts
└── workspaceTransfer.ts

shared/
├── positionSchema.ts
└── workspacePackageSchema.ts

scripts/
└── build-sidecar.mjs

src-tauri/
├── capabilities/
│   └── desktop.json
├── icons/
├── src/
│   ├── lib.rs
│   └── main.rs
├── binaries/
├── build.rs
├── Cargo.toml
└── tauri.conf.json
```

**Structure Decision**: Add the conventional `src-tauri/` shell beside the existing application. Keep domain and persistence behavior in the current TypeScript server modules. Add only the sidecar build script and small lifecycle hooks needed to make that server relocatable and desktop-managed.

## Design

### Desktop Runtime

1. The Tauri process enforces a single application instance.
2. At startup it resolves and creates the application-local workspace directory.
3. It launches the bundled backend sidecar with an ephemeral loopback port, workspace path, production mode, and parent-process lifecycle settings.
4. The sidecar initializes missing files from bundled empty templates, starts the existing API/static server, and emits one machine-readable readiness line containing its chosen URL.
5. The Tauri window navigates to that loopback URL only after readiness; startup failure displays a concise recovery screen without altering data.
6. Closing the final application window terminates the sidecar cleanly. Unexpected shell termination is covered by parent-process detection in the sidecar.

### Existing Server Adaptation

- Replace fixed project-root data paths with explicit startup options while retaining the current project paths as development defaults.
- Allow port `0` so the operating system selects an available loopback port.
- Resolve production static assets and empty data templates from paths supplied by the desktop shell.
- Export a start/stop lifecycle that existing server tests can exercise without spawning the desktop application.
- Keep every existing `/api` contract unchanged.

### Desktop Integration

- Use the opener integration for validated `http` and `https` links and for revealing the workspace directory in Windows Explorer.
- Use native open/save dialogs for ZIP import/export while preserving validation, preview, backup, and restore semantics.
- Restrict desktop permissions to the main window and the loopback application origin.
- Do not grant arbitrary filesystem or shell access to frontend code.

### Packaging

- Bundle the server and JavaScript dependencies into one CommonJS entry, then produce a Windows Node single-executable sidecar.
- Declare that executable as a Tauri external binary and include only `dist/` assets plus empty data templates as packaged resources.
- Build an x64 NSIS per-user setup executable. MSI, portable ZIP, signing, automatic updates, and other operating systems remain out of scope.
- Exclude `data/positions.json`, uploaded files, backups, test fixtures, build caches, and local logs from all bundles.

## Verification Strategy

- Retain and run the complete existing Vitest suite against the HTTP server.
- Add focused tests for configurable data/resource paths, ephemeral ports, readiness output, shutdown, and invalid data recovery.
- Add Rust tests for sidecar argument construction, readiness parsing, lifecycle cleanup, and single-instance focus behavior where practical.
- Build the sidecar and installer from a clean checkout.
- Install, launch, create data, restart 20 times, update/reinstall, and uninstall/reinstall while verifying data persistence.
- Export the current workspace ZIP and import it into a clean desktop workspace; compare all records and binary files.
- Verify external links use the default browser and the data-folder action opens the exact workspace directory.
- Inspect the installer contents and installed resources to confirm private/test data is absent.

## Post-Design Constitution Check

PASS. The design preserves the approved journey, keeps JSON storage human-readable and user-owned, reuses the existing tested backend, introduces only a narrow desktop shell, and leaves implementation behind explicit task and implementation approvals.

## Complexity Tracking

No constitution violations require justification.
