# Quickstart: Validate Authenticated Online Workspace

This guide describes the commands and end-to-end evidence required after implementation. It does not authorize implementation.

## Prerequisites

- Node.js 22 LTS and npm
- Rust toolchain supported by Tauri 2
- Docker with Compose for local PostgreSQL and S3-compatible integration services
- Two test email inboxes controlled by the tester
- A Windows 10/11 machine for installed desktop callback checks
- A test network in Iran for production-provider validation
- No real resume, credential, or private workspace data in automated tests

## Local Environment

Expected non-secret example configuration:

```text
APP_ORIGIN=http://127.0.0.1:4173
API_ORIGIN=http://127.0.0.1:4173
DATABASE_URL=postgresql://workspace:workspace@127.0.0.1:5432/workspace_test
S3_ENDPOINT=http://127.0.0.1:9000
S3_BUCKET=workspace-test
MAIL_MODE=test
DESKTOP_REDIRECT_URI=job-application-workspace-dev://auth/callback
```

Secrets belong in ignored environment files or the deployment secret manager. They must not appear in this guide, source control, logs, screenshots, or exported packages.

## Install And Start

After implementation, the workspace scripts must support:

```powershell
npm install
npm run services:up
npm run db:migrate
npm run dev
```

Expected result:

- PostgreSQL and test object storage report healthy.
- The Fastify API and React application start on the documented local origin.
- The application opens to an authentication screen in the browser.
- The desktop development command remains separately available through `npm run tauri:dev`.

## Automated Quality Gate

```powershell
npm run typecheck
npm test
npm run test:contract
npm run test:integration
npm run test:e2e
npm run tauri:check
npm run build
```

Expected result: all commands exit successfully. Integration tests use isolated test accounts, database schemas, buckets, and temporary local workspace directories.

## Scenario 1: Existing Offline Mode

1. Disconnect networking and launch the installed desktop application with an existing local workspace.
2. Select Offline mode.
3. Create a position, add a question and reading, attach a test resume, close the app, and reopen it.
4. Export the Offline workspace package.

Expected:

- No account is required.
- All edits survive restart in human-readable local JSON.
- The ZIP validates and contains the expected records/files.
- No authentication credential exists in the JSON or ZIP.

## Scenario 2: Account Registration And Isolation

1. Register Account A and verify its test email.
2. Register Account B and verify its test email.
3. Create distinct positions and files in each account.
4. Attempt every Account A record/file URL and mutation with Account B's session.

Expected:

- Unverified accounts cannot open Online workspaces.
- Account B receives not-found or unauthorized responses without Account A metadata.
- Authorization contract tests cover list, detail, update, nested records, files, exports, sync attempts, sessions, and deletion.

## Scenario 3: Desktop Sign-In

1. Install the development-signed desktop package with its registered development URI scheme.
2. Start Online sign-in.
3. Complete authentication in the system browser.
4. Verify the deep link returns to the existing application instance.
5. Restart the app and refresh the session.

Expected:

- S256 PKCE is present and no client secret is packaged.
- Wrong state/verifier/issuer and callback replay are rejected.
- Refresh material exists only in protected Tauri storage.
- Signing out revokes/removes credentials but leaves Offline data intact.

See [desktop-auth.md](./contracts/desktop-auth.md).

## Scenario 4: Online Outage Editing

1. Sign in to Online mode and wait for a confirmed mirror revision.
2. Disconnect networking.
3. Edit multiple records and restart the application.
4. Reconnect without approving synchronization.

Expected:

- The account-specific Online working copy remains usable during the outage.
- Changes survive restart and show Pending upload.
- Online data remains unchanged after reconnection.
- The app performs only a revision check and asks for a decision.

## Scenario 5: Pending Working Copy Replaces Online

1. Continue from Scenario 4.
2. Preview Replace Online with this local working copy.
3. Confirm replacement.
4. Open the account in a second client.

Expected:

- Preview shows both counts/revisions and says no merge occurs.
- The prior Online workspace is backed up before replacement.
- The second client sees the complete local working-copy data.
- The local source is unchanged, pending state clears, and revisions match.

## Scenario 6: Cross-Device Conflict

1. Create pending Online working-copy edits on Device A while disconnected.
2. Change Online data from Device B.
3. Reconnect Device A and request upload.

Expected:

- Preview reports that Online changed after Device A's last confirmed revision.
- No replacement occurs without explicit confirmation against the current revision.
- If Online changes again after preview, confirmation returns `SYNC_DESTINATION_CHANGED` and requires a new preview.

## Scenario 7: Online Replaces Offline

1. Give Offline and Online distinct test data.
2. Select Download Online and replace Offline.
3. Review and confirm.
4. Disconnect and reopen Offline mode.

Expected:

- Offline destination is backed up first.
- Offline becomes an exact validated copy of Online.
- Online remains unchanged.
- The previous Offline workspace can be restored from its backup.

## Scenario 8: Offline Replaces Online

1. Give Offline and Online distinct test data.
2. Select Upload Offline and replace Online.
3. Review and confirm.

Expected:

- Online destination is backed up first.
- Online becomes an exact validated copy of Offline.
- Offline remains unchanged.
- Repeating the confirmation does not duplicate records or files.

See [synchronization.md](./contracts/synchronization.md).

## Scenario 9: Failure Safety

Inject failures separately during upload, package validation, destination backup, object staging, database transaction, local restore, and post-success mirror refresh.

Expected:

- Before confirmation, neither side changes.
- Backup failure prevents replacement.
- Staging/database failures leave the previous destination active.
- A remote success followed by client disconnect is discoverable through the same attempt ID.
- No partial or orphaned data becomes user-visible.

## Scenario 10: Managed Production Access From Iran

Run these checks from the intended Iranian network before production approval:

1. Create and fund the hosting, database, object-storage, mail, DNS, and TLS services using an available payment path.
2. Deploy the built Node service and apply reviewed migrations.
3. Register, verify email, sign in, refresh, and revoke a session.
4. Upload and download private resume/logo fixtures using short-lived access.
5. Run Offline-to-Online and Online-to-Offline replacement with backups.
6. Export database, objects, and a portable workspace package.
7. Restore them into an isolated test environment.
8. Record provider terms, account owner, payment method, support path, backup retention, and migration procedure without recording secrets.

Expected:

- All operations are reachable without an undeclared foreign account or blocked payment dependency.
- No production selection is approved if registration, payment, email, object access, backup, or restore fails.
- A provider-independent workspace ZIP and database/object backup can be retrieved.

## Required Evidence

- Passing command output for all automated gates
- OpenAPI validation report for [openapi.yaml](./contracts/openapi.yaml)
- Screenshots for mode indicator, pending state, conflict preview, and both replacement confirmations
- Authorization matrix showing zero cross-account access
- Desktop deep-link and protected-storage test results
- Backup/restore checksums and record counts
- Dated Iran-network provider validation record
