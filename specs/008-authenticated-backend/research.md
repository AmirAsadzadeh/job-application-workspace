# Research: Authenticated Online Workspace

## Decision 1: Preserve One Repository With Separate Applications

**Decision**: Use an npm workspace monorepo containing the React web application, remote Fastify API, local Node sidecar, Tauri desktop shell, and shared domain package.

**Rationale**: The current UI, local server, desktop wrapper, and Zod schemas already share one release history. Separate deployable applications keep runtime responsibilities clear while shared schemas prevent online and offline formats from drifting.

**Alternatives considered**:

- Separate backend repository: rejected because coordinated schema and package-version changes would add release overhead at the current scale.
- Keep every runtime in the root package: rejected because remote-only dependencies and deployment scripts would become entangled with the desktop sidecar.

## Decision 2: Fastify For The Remote API

**Decision**: Evolve the existing Node/TypeScript service boundary into a separately deployable Fastify API on Node.js 24 LTS while retaining Zod domain validation.

**Rationale**: Fastify has first-class TypeScript support, lifecycle hooks suitable for authentication/authorization, and schema-driven validation and serialization. Better Auth documents a supported Fastify integration. Node.js 24 is the current LTS line and receives support through April 2028. [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) [Better Auth Fastify integration](https://better-auth.com/docs/integrations/fastify) [Node.js 24 LTS](https://nodejs.org/en/blog/migrations/v22-to-v24)

**Alternatives considered**:

- Continue directly on `node:http`: viable but rejected because authentication, CORS, error handling, request limits, and route composition would require more custom security-sensitive infrastructure.
- Full-stack framework replacement: rejected because it would rewrite the functioning React/Vite application without adding user value.

## Decision 3: Better Auth With PostgreSQL Sessions

**Decision**: Use Better Auth for email/password registration, verification, recovery, session management, and the first-party OAuth 2.1 desktop flow. Store users and sessions in PostgreSQL.

**Rationale**: Better Auth supports email/password, database-backed users/sessions, Fastify, and an OAuth 2.1 Provider with mandatory PKCE for public clients. It also allows a configurable email provider, avoiding a mandatory social identity service. [Email/password](https://better-auth.com/docs/authentication/email-password) [Database model](https://better-auth.com/docs/concepts/database) [OAuth 2.1 Provider](https://better-auth.com/docs/plugins/oauth-provider)

**Alternatives considered**:

- Custom password/session implementation: rejected because it creates avoidable cryptographic and lifecycle risk.
- Supabase Auth: technically suitable, but rejected as the primary choice because direct dependence on a foreign managed backend increases regional access and payment risk.
- Required Google or GitHub sign-in: rejected because the specification forbids mandatory social login and provider access can vary.

## Decision 4: Different Session Transport For Web And Desktop

**Decision**: Use secure HttpOnly cookies for the same-origin web application. Use system-browser Authorization Code with S256 PKCE for Tauri, store refresh credentials in Tauri Stronghold, and keep access tokens in process memory.

**Rationale**: OWASP advises against storing session identifiers or refresh tokens in browser storage. OAuth native-app best practice requires an external user agent and PKCE. Tauri supports registered deep links and protected secret storage. [OWASP session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) [RFC 8252](https://datatracker.ietf.org/doc/html/rfc8252) [Tauri deep links](https://v2.tauri.app/plugin/deep-linking/) [Tauri Stronghold](https://v2.tauri.app/reference/javascript/stronghold/)

**Alternatives considered**:

- Persist bearer tokens in `localStorage`: rejected by the constitution and OWASP guidance.
- Authenticate inside an embedded third-party browser view: rejected because it weakens native authorization isolation.
- Give the desktop binary a client secret: rejected because installed applications cannot keep shared secrets confidential.

## Decision 5: PostgreSQL And Drizzle Migrations

**Decision**: Store normalized online domain records and auth records in PostgreSQL, accessed through Drizzle ORM using committed SQL migrations.

**Rationale**: PostgreSQL transactions support atomic domain replacement, relational constraints preserve nested ownership, and row-level security can provide defense in depth. Drizzle supports PostgreSQL and generated, reviewable migration files. [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html) [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) [Drizzle migrations](https://orm.drizzle.team/docs/migrations)

**Alternatives considered**:

- Remote JSON files: rejected because concurrent accounts, sessions, revisions, and transactional replacements need stronger isolation and consistency.
- Document database: rejected because the domain contains stable relational identities and replacement validation already depends on those relationships.

## Decision 6: Existing ZIP Package As Synchronization Payload

**Decision**: Reuse the existing versioned workspace ZIP manifest, CSVs, checksums, resumes, and logos for every complete directional replacement.

**Rationale**: The format already validates identity, relationships, paths, types, and file checksums. Reuse keeps manual export, disaster recovery, Offline-to-Online upload, Online-to-Offline download, and provider exit on one tested representation.

**Alternatives considered**:

- Per-field merge protocol: rejected because conflict semantics are not approved and would undermine the explicit complete-replacement model.
- Separate proprietary sync format: rejected because it duplicates validation and weakens portability.

## Decision 7: Online Working Copies Use The Existing JSON Repository

**Decision**: Maintain one account-scoped local JSON working copy for Online mode, plus non-secret sync metadata containing last confirmed remote revision and pending status.

**Rationale**: This directly reuses current validation, atomic local writes, managed-file storage, and restart behavior. It allows outage editing without pretending a remote save succeeded.

**Alternatives considered**:

- Browser service-worker database: rejected because desktop is the required offline-capable Online client and product records cannot use browser storage.
- Operation queue with automatic replay: rejected because the approved spec requires explicit replacement and no automatic merge/upload.

## Decision 8: Managed Liara Services As Reference Production Target

**Decision**: Target Liara Node PaaS, managed PostgreSQL, private S3-compatible Object Storage, Mail, custom domain, and TLS for the first production deployment. Keep standard interfaces and exports so another provider can replace it.

**Rationale**: Liara officially lists Node hosting, managed PostgreSQL with backups, Iranian infrastructure/pricing, mail APIs, and private S3-compatible storage with presigned URLs. This materially reduces Iran payment and connectivity risk compared with relying only on a foreign managed backend. Actual account creation, payment, and end-user connectivity still require pre-production verification. [Liara PaaS](https://developers.liara.ir/pages/paas) [Liara database](https://liara.ir/products/cloud-database) [Liara object storage](https://developers.liara.ir/pages/object-storage) [Liara pricing](https://liara.ir/pricing)

**Alternatives considered**:

- Managed Supabase: rich integrated platform, but rejected as the reference target because regional account/payment availability is not guaranteed.
- Self-hosted production stack: rejected because the user does not require self-hosting and managed operations reduce maintenance.
- Provider-specific data APIs: rejected because standard PostgreSQL and S3 interfaces provide a clearer exit path.

## Decision 9: Backup-First Generation Replacement

**Decision**: Represent synchronization as a staged generation. Validate source files, create a versioned destination backup, stage immutable objects, replace relational data in one transaction with an expected revision, then activate the generation.

**Rationale**: Database and object storage do not share one transaction. Immutable staged object keys plus an atomic database pointer/revision change prevent partial user-visible replacement and allow cleanup after failure.

**Alternatives considered**:

- Delete destination and import in place: rejected because failure could destroy the active workspace.
- Copy individual records over existing rows: rejected because it behaves like an implicit merge and complicates rollback.

## Decision 10: No Automatic Background Synchronization

**Decision**: Connectivity restoration triggers only an online revision check. Upload, download, overwrite, and discard actions always require a user preview and confirmation.

**Rationale**: This matches the approved user-control model, avoids hidden data movement, and makes cross-device conflict visible.

**Alternatives considered**:

- Last-write-wins: rejected because it can silently destroy newer work.
- Automatic operation replay: rejected because it changes online data without the approval required by the specification and constitution.
