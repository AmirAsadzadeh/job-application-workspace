# Codex Handoff Prompt

Copy the prompt below into another Codex account to continue this feature.

```text
Continue implementing the authenticated Online/Offline workspace feature in the
job-application-workspace repository. Start from the latest commit on main.

First:
1. Read AGENTS.md. It references RTK.md, but RTK.md may be missing.
2. Read the complete Spec Kit feature under specs/008-authenticated-backend/.
3. Pay particular attention to spec.md, plan.md, tasks.md, research.md,
   data-model.md, contracts/, quickstart.md, and quickstart-results.md.
4. Use the local speckit-implement skill and continue from the existing task
   checklist. Do not regenerate or replace the approved specification.

Approved product decisions:
- The application has separate Offline and Online modes.
- Offline mode continues using local JSON and files.
- Online storage requires authentication and explicit synchronization approval.
- Synchronization is directional replacement, not automatic merging.
- Before replacement, create a recoverable destination backup.
- The user explicitly chooses whether to overwrite Online data with local data
  or overwrite local data with Online data.
- If Online mode loses internet access, edits continue in a local working copy.
  Reconnection must not upload silently; the user approves replacement.
- Never modify, delete, expose, or commit the user's real workspace data.
- Production does not require a self-hosted backend.
- Deployment choices must account for accessibility and service limitations
  affecting users in Iran.

Current architecture:
- apps/web: React frontend
- apps/api: Fastify, Better Auth, Drizzle/PostgreSQL, and S3-compatible storage
- apps/local-service: offline workspace and synchronization support
- apps/desktop: Tauri desktop shell, PKCE/deep-link handling, and
  Stronghold/keyring credential storage
- packages/domain: shared schemas and domain behavior

Current progress:
- 59 of 82 tasks are complete.
- 23 tasks remain in specs/008-authenticated-backend/tasks.md.
- The unit suite passed with 41 files and 191 tests.
- npm run build passed.
- npm run build:online passed.
- npm run tauri:check passed.
- npm run tauri:test passed with 3 native tests.
- Live PostgreSQL, MinIO, and Mailpit integration checks were blocked because
  Docker Engine was unavailable.

Recommended next sequence:
1. Start Docker/PostgreSQL/MinIO/Mailpit and verify the development stack.
2. Implement and run T021-T024 and T027 integration tests.
3. Complete T028-T029 local synchronization and React coverage.
4. Audit and complete T034 PostgreSQL CRUD parity.
5. Implement T039 row-security policies and authorization tests.
6. Complete browser, desktop, and synchronization E2E tasks T030-T032.
7. Run and record T072 quickstart scenarios.
8. Complete deployment, security, accessibility, cleanup, backup,
   Iran-provider, contract, and final verification tasks T073-T082.

Work directly from unchecked tasks in tasks.md. Mark a task complete only after
its implementation and verification are genuinely finished. Keep changes
focused, provide progress updates, and make atomic commits. Do not push unless
the user explicitly asks.
```
