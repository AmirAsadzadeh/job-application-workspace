# Tasks: Desktop Application

**Input**: Design documents from `/specs/007-desktop-application/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Automated tests are required because this journey changes process lifecycle, storage paths, packaging, and the runtime boundary used by every existing workflow.

**Organization**: Setup and foundational work establish the desktop toolchain and sidecar. The single approved user story then delivers one independently testable Windows desktop application.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches separate files and has no dependency on another incomplete task
- **[US1]**: User Story 1, Launch and Use the Desktop Workspace

## Phase 1: Setup

**Purpose**: Establish the approved Windows desktop build environment and project structure.

- [X] T001 Install Rust stable MSVC and Microsoft C++ Build Tools, verify `cargo`, `rustc`, and `cl`, and record exact detected versions in `specs/007-desktop-application/quickstart.md`
- [X] T002 Add Tauri 2 CLI, API, opener, dialog, single-instance, sidecar build, and bundling dependencies plus `tauri:dev`, `tauri:build`, and sidecar scripts in `package.json` and `package-lock.json`
- [X] T003 Scaffold the desktop crate and base application metadata in `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, and `src-tauri/tauri.conf.json`
- [X] T004 [P] Exclude Rust targets, generated sidecars, installers, and temporary single-executable artifacts in `.gitignore`

**Checkpoint**: The repository recognizes the desktop project and all required build commands without yet changing product behavior.

---

## Phase 2: Foundational Sidecar Runtime

**Purpose**: Make the existing server relocatable and packageable before connecting it to the desktop shell.

**Critical**: User Story 1 cannot begin until this phase is complete.

- [X] T005 Add failing tests for desktop argument parsing, explicit workspace/resource paths, ephemeral ports, readiness output, invalid arguments, invalid JSON, unsupported future schema versions, denied reads/writes, preservation of affected files, and graceful shutdown in `server/desktopRuntime.test.ts`
- [X] T006 Implement validated desktop startup options and parent-process monitoring in `server/desktopRuntime.ts`
- [X] T007 Refactor server creation to accept explicit runtime paths, host, port, and lifecycle controls while preserving development defaults and all existing API contracts in `server/index.ts`
- [X] T008 Add the production sidecar entry point and exact `WORKSPACE_READY` output contract in `server/sidecar.ts`
- [X] T009 Run and repair the existing HTTP, repository, resume, and workspace-transfer tests for the refactored server in `server/index.test.ts`, `server/positionsRepository.test.ts`, `server/resumeStorage.test.ts`, and `server/workspaceTransfer.test.ts`
- [X] T010 Implement deterministic server bundling and Windows Node single-executable generation in `scripts/build-sidecar.mjs` and `scripts/sea-config.json`
- [X] T011 Register the target-triple sidecar binary and packaged `dist/` plus empty-template resources in `src-tauri/tauri.conf.json`

**Checkpoint**: A self-contained backend executable starts against an isolated workspace, serves the unchanged application/API, reports its selected loopback origin, and exits with its owner.

---

## Phase 3: User Story 1 - Launch and Use the Desktop Workspace (Priority: P1)

**Goal**: Install and launch the complete workspace like a normal Windows application, with private local data preserved and no terminal or browser address required.

**Independent Test**: Install on a supported Windows computer, launch from the Start menu, import an existing workspace ZIP, create and edit a position, close and reopen the app, and verify all records and files remain available without running a command.

### Tests for User Story 1

- [X] T012 [P] [US1] Add failing Rust tests for readiness parsing, sidecar argument construction, workspace path resolution, shutdown cleanup, and second-launch focus behavior in `src-tauri/src/lib.rs`
- [X] T013 [P] [US1] Add failing frontend tests for desktop environment detection, external URL opening, data-folder reveal, and native ZIP selection/save fallbacks in `src/desktop/desktopBridge.test.ts`
- [X] T014 [P] [US1] Add failing UI tests for desktop actions and unchanged browser behavior in `src/features/positions/components/WorkspaceTransferDialog.test.tsx`, `src/features/positions/components/PositionDetailsRoute.test.tsx`, and `src/features/positions/components/PositionReadinessSection.test.tsx`

### Desktop Lifecycle

- [X] T015 [US1] Implement per-user workspace initialization, sidecar launch/readiness, primary-window navigation, controlled shutdown, and recovery state in `src-tauri/src/lib.rs`
- [X] T016 [US1] Wire the desktop entry point and ensure the single-instance plugin is initialized before other plugins in `src-tauri/src/main.rs`
- [X] T017 [US1] Add a restrained loading and startup-recovery surface with Retry, Open data folder, and Close actions in `src-tauri/bootstrap/index.html` and `src-tauri/bootstrap/styles.css`
- [X] T018 [US1] Define least-privilege main-window, loopback-origin, opener, dialog, and sidecar permissions in `src-tauri/capabilities/desktop.json`

### Desktop Integrations

- [X] T019 [US1] Implement a browser-compatible desktop bridge for validated URL opening, fixed workspace-folder reveal, and native ZIP open/save flows in `src/desktop/desktopBridge.ts`
- [X] T020 [US1] Route job-platform, career-page, and reading links through the desktop bridge while retaining normal browser anchors in `src/features/positions/components/PositionDetailsRoute.tsx` and `src/features/positions/components/PositionReadinessSection.tsx`
- [X] T021 [US1] Adapt ZIP import/export to native desktop dialogs with browser fallback and unchanged preview/restore semantics in `src/features/positions/components/WorkspaceTransferDialog.tsx` and `src/features/positions/positionApi.ts`
- [X] T022 [US1] Add a compact Open data folder action to the existing workspace transfer area in `src/features/positions/components/WorkspaceTransferDialog.tsx`

### Installer and Story Verification

- [X] T023 [P] [US1] Create the application icon set without private or mock content in `src-tauri/icons/`
- [X] T024 [US1] Configure the unsigned Windows x64 per-user NSIS installer, application identity, shortcuts, WebView2 behavior, and data-preserving uninstall behavior in `src-tauri/tauri.conf.json`
- [X] T025 [US1] Build the sidecar and installer, then verify the setup executable is emitted under `src-tauri/target/release/bundle/nsis/` using `specs/007-desktop-application/quickstart.md`
- [X] T026 [US1] Install and execute the independent User Story 1 test, timing installation plus launch to confirm completion within three minutes and a usable screen within five seconds; verify ZIP migration, all current workflows, external links, data-folder reveal, second launch, invalid/unwritable data recovery without file replacement, and 20 close/reopen cycles, recording results in `specs/007-desktop-application/checklists/acceptance.md`

**Checkpoint**: User Story 1 is independently complete and the generated setup executable provides the entire approved desktop experience.

---

## Phase 4: Polish and Cross-Cutting Verification

**Purpose**: Confirm documentation, privacy, compatibility, and regression quality across the finished journey.

- [X] T027 [P] Document desktop prerequisites, development commands, installer build command, installer output path, data location, migration, and unsigned-install notice in `README.md`
- [X] T028 Run the full Vitest, performance, Rust, frontend build, sidecar build, and installer build checks and record results in `specs/007-desktop-application/checklists/acceptance.md`
- [X] T029 Inspect generated sidecar, resources, and NSIS contents for runtime records, resumes, uploaded logos, backups, mocks, tests, caches, and development-only files; record the privacy audit in `specs/007-desktop-application/checklists/acceptance.md`
- [ ] T030 Verify clean-checkout installation and launch on clean Windows 10 x64 and Windows 11 x64 virtual machines or physical systems, identify each environment used, and record platform results in `specs/007-desktop-application/checklists/acceptance.md`

---

## Dependencies and Execution Order

### Phase Dependencies

- **Phase 1, Setup**: Starts after task approval. T004 can run alongside T002-T003.
- **Phase 2, Foundational Sidecar Runtime**: Depends on T001-T003. T005 must fail before T006-T008; T010 follows a working sidecar entry; T011 follows T010.
- **Phase 3, User Story 1**: Depends on the complete foundational sidecar. T012-T014 can run in parallel and must fail before implementation. T015-T018 establish the shell before T019-T022 integrate the UI. T024-T026 complete the installable journey.
- **Phase 4, Polish**: Depends on the complete user story. T027 can run in parallel with the first verification pass; T028-T030 finish sequentially as environments are available.

### User Story Dependency

- **User Story 1 (P1)**: Depends only on shared setup and foundational sidecar work. It has no dependency on an unapproved future story.

### Critical Path

```text
T001 -> T002 -> T003 -> T005 -> T006 -> T007 -> T008 -> T010 -> T011
     -> T012 -> T015 -> T016 -> T018 -> T019 -> T021 -> T024 -> T025 -> T026
     -> T028 -> T029 -> T030
```

### Parallel Opportunities

- T004 can proceed while the Tauri scaffold is prepared.
- T012, T013, and T014 cover separate Rust, bridge, and UI test files.
- T023 can proceed while desktop integration behavior is implemented.
- T027 can proceed while packaged acceptance verification begins.

## Parallel Example: User Story 1

```text
Task T012: Add lifecycle tests in src-tauri/src/lib.rs
Task T013: Add bridge tests in src/desktop/desktopBridge.test.ts
Task T014: Add desktop UI tests in existing component test files
Task T023: Create installer icon assets in src-tauri/icons/
```

## Implementation Strategy

### MVP Delivery

1. Complete the desktop build setup.
2. Make the existing backend relocatable and package it as the sidecar.
3. Write failing lifecycle and integration tests.
4. Implement the Tauri shell and narrow desktop bridge.
5. Build and install the NSIS package.
6. Validate the single approved journey end to end before polishing documentation.

### Safety Gates

- Export the current real workspace before the first desktop migration test.
- Use isolated temporary workspaces for automated tests and development launches.
- Never package or stage the source checkout's runtime `data/` files.
- Stop if the package inspection finds any private or test data.
- Do not mark the journey complete until persistence survives restart, reinstall, and the 20-cycle check.

## Notes

- Every task uses an exact target path and follows the required checklist format.
- Tests precede implementation where the lifecycle or user-facing contract changes.
- Generated binaries and installer artifacts are outputs, not source-controlled files.
- Rust/C++ tool installation and implementation require explicit approval after this task list is approved.
