# Tasks: Authenticated Online Workspace

**Input**: Design documents from `specs/008-authenticated-backend/`

**Prerequisites**: Approved `plan.md`, approved `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the specification success criteria and written before the implementation they verify.

**Organization**: The approved specification contains one P1 user journey. Setup and shared foundations precede one independently testable user-story phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an incomplete task.
- **[US1]**: Implements User Story 1, Access One Private Workspace Across Machines.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish independently buildable packages without changing current behavior.

- [X] T001 Add npm workspace definitions and package-level scripts for web, API, local service, desktop, and domain packages in `package.json`
- [X] T002 Move existing shared Zod schemas and tests into `packages/domain/src/` and create `packages/domain/package.json`
- [X] T003 Move the existing React/Vite application into `apps/web/` and update imports to consume `@workspace/domain`
- [X] T004 Move the existing Node server, JSON repositories, workspace transfer services, and tests into `apps/local-service/src/`
- [X] T005 Move the existing Tauri project into `apps/desktop/src-tauri/` and repair sidecar/resource paths in `apps/desktop/src-tauri/tauri.conf.json`
- [X] T006 Update TypeScript, Vite, Vitest, sidecar-build, and Tauri scripts for the workspace paths in `tsconfig*.json`, `vite.config.ts`, and `scripts/`
- [X] T007 Run the existing unit, performance, production-build, sidecar, and Tauri checks and record the behavior-preserving relocation result in `specs/008-authenticated-backend/quickstart-results.md`

**Checkpoint**: Existing Offline application behavior passes unchanged from the new package layout.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create shared infrastructure required by every part of the authenticated journey.

**CRITICAL**: No User Story 1 implementation begins until this phase passes.

- [X] T008 Create the Fastify API package, health endpoint, graceful shutdown, and Node 24 engine declaration in `apps/api/package.json` and `apps/api/src/server.ts`
- [X] T009 [P] Add validated server environment configuration with secret-safe startup errors in `apps/api/src/config.ts` and `.env.example`
- [X] T010 [P] Add local PostgreSQL, S3-compatible storage, and mail-capture services for tests in `compose.yaml`
- [X] T011 Define Drizzle PostgreSQL tables, constraints, indexes, and generated SQL migrations from `data-model.md` in `apps/api/src/db/schema/` and `apps/api/drizzle/`
- [X] T012 Add database connection, transaction helpers, migration command, and test isolation utilities in `apps/api/src/db/connection.ts` and `apps/api/src/db/testDatabase.ts`
- [X] T013 Configure Better Auth users, verification, database sessions, email/password rules, and trusted origins in `apps/api/src/auth/auth.ts`
- [X] T014 Configure the Better Auth OAuth 2.1 Provider public desktop client, exact redirects, scopes, S256 PKCE, refresh, revocation, and discovery endpoints in `apps/api/src/auth/oauth.ts`
- [X] T015 [P] Implement a provider-neutral transactional email interface and test adapter in `apps/api/src/email/emailProvider.ts` and `apps/api/src/email/testEmailProvider.ts`
- [X] T016 [P] Implement private S3-compatible object operations, immutable keys, checksums, presigned downloads, and test adapter in `apps/api/src/storage/objectStorage.ts`
- [X] T017 Add authenticated request context that derives owner identity from verified cookie or desktop token sessions in `apps/api/src/auth/requireSession.ts`
- [X] T018 Add consistent validation, request-size limits, security headers, CORS, rate limiting, redacted logging, and error envelopes in `apps/api/src/plugins/`
- [X] T019 Add the shared API/synchronization schemas and stable error-code definitions in `packages/domain/src/onlineSchema.ts` and `packages/domain/src/errors.ts`
- [X] T020 Add OpenAPI generation and contract conformance infrastructure based on `contracts/openapi.yaml` in `apps/api/src/openapi.ts` and `tests/contract/openapi.test.ts`

**Checkpoint**: API starts against isolated services, migrations apply, authentication endpoints respond, and unauthenticated domain requests fail closed.

---

## Phase 3: User Story 1 - Access One Private Workspace Across Machines (Priority: P1) MVP

**Goal**: Deliver explicit Offline and Online modes, secure authenticated online access, outage editing through an account-specific local working copy, and user-approved complete replacement in either direction.

**Independent Test**: Complete all ten scenarios in `quickstart.md` using two accounts, two clients, an existing Offline workspace, simulated outages, concurrent updates, both replacement directions, destination backups, and the Iran-network deployment check.

### Tests For User Story 1

> Write each test first and verify that it fails for the intended missing behavior before implementing its corresponding capability.

- [ ] T021 [P] [US1] Add registration, verification, sign-in, recovery, session-list, revocation, and non-enumerating-error integration tests in `tests/integration/auth.test.ts`
- [ ] T022 [P] [US1] Add a complete cross-account authorization matrix for positions, nested data, files, exports, synchronization attempts, sessions, and deletion in `tests/integration/authorization.test.ts`
- [ ] T023 [P] [US1] Add PostgreSQL workspace repository parity and optimistic-revision tests using the existing domain fixtures in `tests/integration/onlineRepository.test.ts`
- [ ] T024 [P] [US1] Add private file upload, type/size/checksum, signed-access, replacement, and orphan-cleanup tests in `tests/integration/managedFiles.test.ts`
- [X] T025 [P] [US1] Add mode-state, account-directory isolation, legacy-path normalization, and credential-exclusion tests in `apps/local-service/src/workspaceMode.test.ts`
- [X] T026 [P] [US1] Add Online working-copy confirmed/pending/restart/connectivity state-machine tests in `apps/local-service/src/onlineWorkingCopy.test.ts`
- [ ] T027 [P] [US1] Add remote synchronization upload, validation, preview, conflict, backup, atomic replacement, expiry, failure, and idempotency tests in `tests/integration/onlineSynchronization.test.ts`
- [ ] T028 [P] [US1] Add local Offline/working-copy destination replacement and backup failure tests in `apps/local-service/src/localSynchronization.test.ts`
- [ ] T029 [P] [US1] Add React tests for auth, mode indicator, pending state, conflict preview, no-merge warning, confirmation, cancellation, and errors in `apps/web/src/features/workspace/`
- [ ] T030 [P] [US1] Add browser end-to-end tests for registration, authenticated CRUD, sessions, cross-client refresh, export, and account deletion in `tests/e2e/onlineWorkspace.spec.ts`
- [ ] T031 [P] [US1] Add desktop end-to-end harness cases for PKCE callback validation, single-instance delivery, protected refresh storage, restart, revocation, and sign-out with pending changes in `tests/e2e/desktopAuth.spec.ts`
- [ ] T032 [P] [US1] Add outage and both-direction replacement end-to-end tests for 1,000 positions in `tests/e2e/synchronization.spec.ts`

### Authenticated Online Persistence

- [X] T033 [P] [US1] Implement account-owned workspace, preference, reference-data, position, link, question, reading, and file mappings in `apps/api/src/repositories/onlineWorkspaceMapper.ts`
- [ ] T034 [US1] Implement PostgreSQL CRUD parity with the existing JSON repository and optimistic workspace/record revisions in `apps/api/src/repositories/onlineWorkspaceRepository.ts`
- [X] T035 [US1] Implement authenticated workspace, revision, reference-data, position, list-view, order, question, and reading routes in `apps/api/src/routes/workspaceRoutes.ts`
- [X] T036 [US1] Implement private resume/logo upload, replacement, deletion, and short-lived download routes in `apps/api/src/routes/managedFileRoutes.ts`
- [X] T037 [US1] Implement account session listing/revocation and recent-auth account deletion orchestration in `apps/api/src/routes/accountRoutes.ts`
- [X] T038 [US1] Implement online workspace ZIP export through the existing package schema and object storage in `apps/api/src/workspace/onlineWorkspaceExport.ts`
- [ ] T039 [US1] Add database row-security policies and owner-scoped service roles as defense in depth in `apps/api/drizzle/` and verify them in `tests/integration/rowSecurity.test.ts`

### Web Authentication And Online Client

- [X] T040 [P] [US1] Implement the same-origin Better Auth React client and session provider in `apps/web/src/features/auth/authClient.ts` and `apps/web/src/features/auth/AuthProvider.tsx`
- [X] T041 [P] [US1] Build compact dark sign-in, registration, verification, recovery, and auth-error views in `apps/web/src/features/auth/`
- [X] T042 [US1] Add authenticated route gating and session-expiry recovery to `apps/web/src/app/App.tsx`
- [X] T043 [US1] Implement the revision-aware remote position API adapter matching current UI operations in `apps/web/src/features/positions/onlinePositionApi.ts`
- [X] T044 [US1] Route browser use through Online mode and mirror current list/detail/create/export behavior in `apps/web/src/features/workspace/WebOnlineWorkspace.tsx`
- [X] T045 [US1] Build compact session review, revoke, sign-out, account-data disclosure, and account-deletion controls in `apps/web/src/features/account/`

### Desktop Modes And Offline-Capable Online Working Copy

- [X] T046 [P] [US1] Implement versioned `workspace-state.json` parsing and atomic persistence in `apps/local-service/src/workspaceModeState.ts`
- [X] T047 [P] [US1] Implement versioned account-specific `sync-state.json` parsing and atomic persistence in `apps/local-service/src/onlineSyncState.ts`
- [X] T048 [US1] Normalize existing workspace paths into the standalone Offline directory with an idempotent backup-first migration in `apps/local-service/src/workspaceLayout.ts`
- [X] T049 [US1] Implement repository selection for standalone Offline and account-scoped Online working-copy directories in `apps/local-service/src/workspaceRepositoryFactory.ts`
- [X] T050 [US1] Extend the loopback API with mode context, explicit mode selection, local summaries, pending state, and account-isolated working-copy endpoints in `apps/local-service/src/routes/workspaceModeRoutes.ts`
- [X] T051 [US1] Implement the desktop remote API client with in-memory access tokens, revision headers, connectivity classification, and non-secret errors in `apps/web/src/features/workspace/desktopOnlineApi.ts`
- [X] T052 [US1] Implement write-through behavior that updates the working copy only after confirmed remote saves and switches to persistent pending mode when confirmation is unavailable in `apps/local-service/src/onlineWorkingCopyService.ts`
- [X] T053 [US1] Prevent automatic replay after reconnection and expose only revision/conflict checks while pending in `apps/local-service/src/connectivityService.ts`

### Desktop Authentication

- [X] T054 [P] [US1] Add Tauri deep-link and Stronghold dependencies and least-privilege capabilities in `apps/desktop/src-tauri/Cargo.toml`, `apps/desktop/src-tauri/tauri.conf.json`, and `apps/desktop/src-tauri/capabilities/desktop.json`
- [X] T055 [US1] Implement single-instance deep-link receipt and strict callback validation in `apps/desktop/src-tauri/src/auth.rs`
- [X] T056 [US1] Implement protected refresh-credential create/read/delete commands without exposing secrets to logs or JSON in `apps/desktop/src-tauri/src/credential_vault.rs`
- [X] T057 [US1] Implement desktop OAuth state, PKCE, system-browser launch, code exchange, refresh, revocation, and memory-only access token handling in `apps/web/src/features/auth/desktopAuth.ts`
- [X] T058 [US1] Integrate desktop authentication events and credential commands with the existing bridge in `apps/web/src/desktop/desktopBridge.ts`

### Explicit Synchronization And Conflict Resolution

- [X] T059 [P] [US1] Implement synchronization attempt persistence, ownership, expiry, and idempotency in `apps/api/src/sync/synchronizationRepository.ts`
- [X] T060 [US1] Implement bounded streaming package upload, checksum, existing manifest validation, and source-count preview in `apps/api/src/sync/uploadService.ts`
- [X] T061 [US1] Implement Online destination summary, last-confirmed revision comparison, and conflict preview in `apps/api/src/sync/previewService.ts`
- [X] T062 [US1] Implement immutable object generation staging and complete Online destination ZIP backup in `apps/api/src/sync/generationService.ts`
- [X] T063 [US1] Implement expected-revision guarded PostgreSQL replacement and generation activation transaction in `apps/api/src/sync/replacementService.ts`
- [X] T064 [US1] Implement authenticated upload-preview, confirm, cancel, and idempotent-result routes in `apps/api/src/routes/synchronizationRoutes.ts`
- [X] T065 [US1] Extend the local transfer service to target Offline or an Online working copy while preserving backup-first atomic restore in `apps/local-service/src/localSynchronizationService.ts`
- [X] T066 [US1] Implement the desktop synchronization orchestrator for all four directions defined by `contracts/synchronization.md` in `apps/web/src/features/workspace/synchronizationApi.ts`
- [X] T067 [P] [US1] Build the compact persistent Offline/Online mode control and active-workspace indicator in `apps/web/src/features/workspace/WorkspaceModeControl.tsx`
- [X] T068 [P] [US1] Build the pending-upload indicator, connectivity state, and explicit review action in `apps/web/src/features/workspace/PendingWorkspaceState.tsx`
- [X] T069 [US1] Build source/destination summaries, conflict warning, no-merge statement, direction choice, and confirmation dialog in `apps/web/src/features/workspace/SynchronizationDialog.tsx`
- [X] T070 [US1] Handle sign-out with pending changes through upload, discard, or cancel decisions in `apps/web/src/features/auth/SignOutGuard.tsx`
- [X] T071 [US1] Refresh the Online working copy after successful upload/download, record the confirmed revision, clear pending state, and announce completion in `apps/local-service/src/onlineWorkingCopyService.ts`

### User Story 1 Integration Checkpoint

- [ ] T072 [US1] Run automated gates and all ten quickstart scenarios, recording counts, checksums, screenshots, authorization matrix, outage results, and residual issues in `specs/008-authenticated-backend/quickstart-results.md`

**Checkpoint**: User Story 1 is independently functional across browser and installed desktop clients with Offline continuity, authenticated Online ownership, outage editing, explicit replacement, and recoverable backups.

---

## Phase 4: Polish And Cross-Cutting Concerns

**Purpose**: Harden deployment, operations, accessibility, security, and documentation without expanding feature scope.

- [ ] T073 [P] Add Liara Node/Docker deployment configuration, health checks, environment mapping, and migration release command in `apps/api/liara.json` and `apps/api/Dockerfile`
- [ ] T074 [P] Add Liara PostgreSQL, Object Storage, Mail, DNS/TLS, backup, and restore operator instructions in `docs/online-deployment.md`
- [ ] T075 [P] Document Offline/Online behavior, pending changes, destructive replacement, backup retention, export, account deletion, and privacy disclosure in `README.md` and `docs/data-ownership.md`
- [ ] T076 [P] Add accessibility tests for keyboard navigation, focus restoration, status announcements, contrast, and compact responsive layouts in `apps/web/src/features/workspace/workspaceAccessibility.test.tsx`
- [ ] T077 Add authentication abuse, session fixation/revocation, CSRF, CORS, upload-bomb, unsafe-path, object-access, and log-redaction security tests in `tests/integration/security.test.ts`
- [ ] T078 Add scheduled cleanup for expired attempts, inactive staged objects, and retained backups with dry-run reporting in `apps/api/src/maintenance/cleanup.ts`
- [ ] T079 Add database and object-storage backup/restore verification commands with checksum comparison in `apps/api/scripts/backup.ts` and `apps/api/scripts/restore-check.ts`
- [ ] T080 Run the documented Iran-network account, payment, authentication, email, file, synchronization, export, and restore checks and record dated non-secret evidence in `docs/operations/iran-provider-validation.md`
- [ ] T081 Validate `contracts/openapi.yaml` with the selected OpenAPI linter and make generated API behavior pass contract tests in `tests/contract/openapi.test.ts`
- [ ] T082 Run formatting, type checking, unit, integration, contract, E2E, performance, production build, sidecar, and Tauri checks and finalize `specs/008-authenticated-backend/quickstart-results.md`

---

## Dependencies And Execution Order

### Phase Dependencies

- **Phase 1 Setup**: Starts immediately. Tasks T001-T006 are sequential because they relocate shared paths; T007 validates the relocation.
- **Phase 2 Foundational**: Depends on T007. T009, T010, T015, and T016 can proceed in parallel after T008; database/auth tasks then converge through T017-T020.
- **Phase 3 User Story 1**: Depends on all foundational tasks. Tests T021-T032 are written first and can be split by subsystem. Implementation then follows the dependency groups below.
- **Phase 4 Polish**: Starts after T072 proves the journey. Documentation and deployment configuration can run in parallel; final checks T080-T082 complete last.

### User Story 1 Dependency Graph

```text
T021-T032 tests
    |
    +--> T033-T039 online persistence/API
    |         |
    |         +--> T040-T045 web online client
    |
    +--> T046-T053 local modes/working copy
    |         |
    |         +--> T054-T058 desktop authentication
    |
    `--> T059-T064 remote synchronization
              + T065 local replacement
              + T066 orchestration
                    |
                    +--> T067-T071 synchronization UX/integration
                              |
                              `--> T072 full journey validation
```

### Detailed Dependencies

- T034 depends on T011-T012, T019, and T033.
- T035-T039 depend on T034, T016-T019, and their failing tests.
- T040-T045 depend on T013-T14, T17, T19, and the relevant remote routes.
- T048-T053 depend on T046-T047 and the behavior-preserving local service from Phase 1.
- T055-T058 depend on T014 and T054.
- T060-T064 depend on T016, T034, T038, T059, and the existing package validator.
- T065 depends on T048-T050 and the existing local transfer service.
- T066 depends on remote T064 and local T065 contracts.
- T067-T071 depend on T050-T058 and T066.
- T072 depends on T021-T071.

## Parallel Opportunities

### Foundation

```text
T009: API environment configuration
T010: Local integration services
T015: Email provider abstraction
T016: Object-storage abstraction
```

### User Story Tests

```text
T021-T024: Remote auth, authorization, repository, and file tests
T025-T026: Local mode and working-copy tests
T027-T028: Remote and local replacement tests
T029-T032: Component, browser, desktop, and scale E2E tests
```

### User Story Implementation

```text
T033: Online mappings
T040-T041: Web auth client and views after auth foundation
T046-T047: Local mode and sync-state persistence
T054: Tauri capability configuration
T059: Synchronization attempt repository
T067-T068: Mode and pending-state UI after their contracts stabilize
```

## Implementation Strategy

### MVP Sequence

1. Complete behavior-preserving monorepo setup.
2. Complete API, database, authentication, storage, and contract foundations.
3. Write all User Story 1 tests before the matching implementation.
4. Deliver authenticated Online CRUD and cross-account isolation.
5. Deliver desktop mode selection and Online working-copy outage behavior.
6. Deliver desktop PKCE authentication.
7. Deliver explicit backup-first replacement and conflict UX.
8. Stop at T072 and validate the complete journey before production work.
9. Complete production hardening and Iran-provider validation.

### Atomic Commit Boundaries

- Workspace relocation with unchanged Offline behavior
- Fastify/PostgreSQL/auth/storage foundation
- Authenticated Online CRUD and authorization
- Desktop Offline/Online modes and local working copies
- Desktop PKCE and credential storage
- Synchronization backend and local replacement
- Synchronization and conflict UX
- Deployment, documentation, and security hardening

## Notes

- Every task must remain within approved feature 008 scope.
- Existing local JSON and ZIP behavior must have passing regression coverage before modification.
- Tests must fail for the intended missing behavior before implementation begins.
- Provider credentials and private data must never enter source control or task artifacts.
- No task implements automatic replay, merging, collaboration, social login, MFA, or realtime subscriptions.
- Stop after task approval; implementation requires a separate explicit approval.
