# Implementation Plan: Authenticated Online Workspace

**Branch**: `008-authenticated-backend` | **Date**: 2026-09-10 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification from `specs/008-authenticated-backend/spec.md`

## Summary

Add explicit Offline and Online modes without removing the current local JSON workspace. Online mode uses an authenticated Fastify service backed by PostgreSQL and private S3-compatible object storage. Each desktop account has a local JSON working copy so Online mode remains editable during temporary outages. All transfers are explicit, complete workspace replacements implemented through the existing versioned ZIP package: preview both sides, warn about newer online revisions, back up the destination, confirm, then atomically activate the replacement. Liara is the reference managed production target because it provides Node hosting, managed PostgreSQL, mail, DNS/TLS, and S3-compatible storage in Iran; infrastructure access must still pass the documented pre-production check.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js 24 LTS; Rust 2021 edition for Tauri 2 desktop integration

**Primary Dependencies**: React 19, Vite 7, Fastify, Better Auth with OAuth 2.1 Provider, Drizzle ORM, Zod 4, Tauri 2 deep-link/single-instance/Stronghold plugins, existing workspace ZIP tooling

**Storage**: Existing human-readable JSON and managed local files for Offline mode and Online working copies; PostgreSQL for online records, auth, sessions, revisions, and sync metadata; private S3-compatible object storage for online resumes, logos, and backup packages

**Testing**: Vitest and Testing Library for unit/component tests; ephemeral PostgreSQL integration tests; OpenAPI contract tests; Playwright browser journeys; Cargo tests and installed Tauri deep-link checks for desktop auth

**Target Platform**: Modern desktop browsers over HTTPS; Windows 10/11 Tauri application; managed Linux Node runtime for production

**Project Type**: npm workspace monorepo containing web frontend, remote API, local sidecar service, desktop shell, and shared domain package

**Performance Goals**: Open a 1,000-position workspace within 5 seconds on normal connectivity; reflect confirmed online changes on another client within 5 seconds after refresh; complete a 1,000-position replacement within 10 minutes including supported files

**Constraints**: Offline mode requires no account or network; Online outage edits must survive restart; no automatic upload/download/merge; destination backup before replacement; no browser local storage for records or credentials; strict account isolation; managed services must be accessible and payable from Iran; existing ZIP exports remain portable

**Scale/Scope**: Initial single-owner workspaces, up to 1,000 positions per account, existing nested entities and managed files, web plus Windows desktop, no teams/sharing/MFA/social login/background merge sync

## Constitution Check

*GATE: Passed before research and re-checked after design.*

| Principle | Design Response | Result |
|-----------|-----------------|--------|
| Specifications are the source of truth | Plan traces to approved feature 008 requirements and preserves all exclusions. | PASS |
| Explicit approval gates | Specification and Constitution 2.0.0 are approved; this phase creates planning artifacts only. | PASS |
| Small, testable user journeys | One journey covers mode choice, authenticated access, outage edits, and explicit directional replacement. | PASS |
| Quiet, scannable UX | Mode and pending state use compact persistent indicators; destructive replacement uses focused previews and confirmations. | PASS |
| User-owned, portable data | Offline JSON remains intact, online transfer is explicit, destination backup is mandatory, and ZIP export remains provider-independent. | PASS |
| Product and technical constraints | Existing schemas, repository behavior, ZIP validation, tests, and Tauri sidecar are reused behind new interfaces. | PASS |

No constitutional exceptions are required.

## Architecture

### Runtime Boundaries

1. **Web application**: Uses Online mode only. It communicates with the remote API on the same HTTPS origin and uses secure HttpOnly session cookies.
2. **Desktop application**: Offers Offline and Online modes. The current loopback sidecar owns the standalone Offline workspace and account-specific Online working copies. It never stores reusable credentials in JSON.
3. **Remote API**: Owns authentication, authorization, online domain operations, revisions, synchronization staging, backups, and signed file access.
4. **Database**: Stores normalized account-owned workspace data and authentication/session records. Every domain query is scoped by the authenticated account.
5. **Object storage**: Stores immutable files under owner/workspace/revision keys. Access is private and issued through short-lived signed URLs.

### Authentication

- Better Auth provides email/password registration, verification, recovery, database sessions, session listing, and revocation.
- Web authentication uses secure, HttpOnly, SameSite cookies on the application origin.
- Desktop authentication uses the system browser and OAuth 2.1 Authorization Code with S256 PKCE. Better Auth acts as the first-party authorization server.
- Tauri registers a fixed deep-link callback and validates issuer, state, redirect URI, and PKCE verifier. Refresh credentials are stored through Tauri Stronghold; access tokens live only in memory.
- Remote API middleware derives `ownerId` from the verified session/token. Client-supplied owner identifiers are never authoritative.

### Workspace Modes And Local State

- `Offline` uses the existing local `positions.json`, `reference-data.json`, resumes, logos, and backups.
- `Online` uses the remote API while reachable and mirrors every confirmed server response into `online/<account-id>/` using the same JSON repository format.
- `workspace-state.json` stores only non-secret mode and synchronization metadata: selected mode, account key, last confirmed remote revision, pending flag, and timestamps.
- If an online write cannot be confirmed, the sidecar applies the validated edit to the Online working copy and marks it pending. Later online writes remain local until the conflict is resolved.
- Reconnection performs only a revision check. It never uploads or downloads records automatically.

### Synchronization And Replacement

- Reuse the current versioned workspace ZIP as the canonical transfer payload.
- The source is exported without mutation and validated by the destination.
- Preview contains direction, source/destination counts, revisions, update times, warnings, and replacement language.
- If remote revision differs from the Online working copy's last confirmed revision, preview marks a conflict.
- Confirmation creates a destination backup first. Failure to back up stops replacement.
- Remote replacement stages files under a new immutable generation, validates checksums, replaces database rows in one transaction, advances the workspace revision, then activates the generation.
- Local replacement uses the existing staged, backup-first, atomic restore service against the selected Offline workspace or Online working copy.
- Successful upload refreshes the Online working copy and clears pending state. Cancel and failure leave both source and active destination unchanged.

### Deployment

- Reference production deployment: Liara Node PaaS, Liara managed PostgreSQL, Liara private S3-compatible Object Storage, Liara Mail, custom domain, and TLS.
- Deploy the web build from the Fastify service so browser auth and API requests share one origin.
- Keep provider-specific credentials behind environment configuration and standard PostgreSQL, SMTP/mail, and S3 interfaces.
- Before production, execute the Iran network, account, payment, email-delivery, object-access, backup-export, and restore checks in `quickstart.md`.

## Project Structure

### Documentation (this feature)

```text
specs/008-authenticated-backend/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- openapi.yaml
|   |-- desktop-auth.md
|   `-- synchronization.md
`-- tasks.md                 # Created only by the tasks phase
```

### Source Code (repository root)

```text
apps/
|-- web/
|   `-- src/                 # Existing React application, mode/auth/sync UI
|-- api/
|   `-- src/
|       |-- auth/            # Better Auth and OAuth provider configuration
|       |-- db/              # Drizzle schema, migrations, connection
|       |-- routes/          # Authenticated workspace API
|       |-- repositories/    # PostgreSQL domain persistence
|       |-- storage/         # S3-compatible managed files and backups
|       `-- sync/            # Preview, staging, backup, replacement
|-- local-service/
|   `-- src/                 # Existing Node sidecar and JSON repositories
`-- desktop/
    `-- src-tauri/           # Existing Tauri shell plus auth callback/vault
packages/
`-- domain/
    `-- src/                 # Existing Zod domain and package schemas
tests/
|-- contract/
|-- integration/
`-- e2e/
```

**Structure Decision**: Convert the existing single package into npm workspaces while preserving code behavior during relocation. The current `src/`, `server/`, `src-tauri/`, and `shared/` ownership boundaries map directly to `apps/web`, `apps/local-service`, `apps/desktop`, and `packages/domain`. The new `apps/api` is independently deployable but versioned in the same repository. Relocation must be a behavior-preserving task before authentication work begins.

## Design Decisions

- Keep Offline, Online working-copy, and remote repositories behind one domain repository interface.
- Use optimistic revisions for normal remote edits and full generation replacement for explicit synchronization.
- Store rich-text documents as validated JSON values; keep searchable scalar fields relational.
- Keep uploaded objects immutable. Replacing a file creates a new object key and updates metadata transactionally.
- Treat all destination backups as versioned workspace packages with retention metadata.
- Return stable machine-readable error codes and quiet user-facing messages consistent with the current API.
- Do not introduce Redis, background workers, collaboration roles, field-level merges, or realtime subscriptions in this journey.

## Post-Design Constitution Check

The Phase 1 design continues to pass all gates. Offline records remain human-readable JSON; Online persistence and working copies are authorized by Constitution 2.0.0; synchronization is explicit and backup-first; no browser persistence is introduced; and the managed deployment retains standard export and recovery paths. No complexity exception is needed.
