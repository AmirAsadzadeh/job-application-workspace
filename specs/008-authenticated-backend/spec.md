# Feature Specification: Authenticated Online Workspace

**Feature Branch**: `008-authenticated-backend`

**Created**: 2026-09-10

**Status**: Approved

**Input**: User description: "Provide separate offline and online modes. Offline mode keeps the existing local functionality. Online mode requires authentication and stores data in a backend. When moving from offline to online, the user explicitly chooses whether offline data replaces online data or online data replaces offline data. Managed production services are allowed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Access One Private Workspace Across Machines (Priority: P1)

As the workspace owner, I want to choose offline or online mode, use the existing local workspace without an account, or sign in to use a private online workspace across machines, with explicit control over which copy wins when I synchronize them.

**Why this priority**: Private cross-machine access is the reason to introduce authentication and a backend. The journey is useful only if existing data can move safely and remains isolated from every other account.

**Independent Test**: Use an offline workspace without an account or network, sign in to Online mode, edit its local working copy during a simulated outage, reconnect and explicitly replace the online workspace, then test both replacement directions with distinct data and verify preview, conflict warning, confirmation, destination backup, complete replacement, no merge, and account isolation.

**Acceptance Scenarios**:

1. **Given** the desktop application has a valid local workspace, **When** no account or network connection is available, **Then** all existing local workspace workflows remain usable without authentication.
2. **Given** no account exists for the user's email address, **When** the user registers with valid credentials and verifies the address, **Then** the account becomes available for sign-in without exposing workspace data before verification.
3. **Given** a registered user, **When** valid credentials are submitted, **Then** the user enters only that account's workspace and the session survives an ordinary application restart until it expires or is revoked.
4. **Given** invalid credentials, an unverified account, or excessive repeated attempts, **When** sign-in is attempted, **Then** access is denied with a useful but non-revealing message and the online workspace remains unavailable.
5. **Given** the user has offline data and signs in to online mode, **When** synchronization is requested, **Then** the user must choose either Upload offline and replace online or Download online and replace offline.
6. **Given** either replacement direction is selected, **When** its preview is shown, **Then** the user sees which workspace will be overwritten, summary counts for both sides, and a clear statement that records will not be merged; neither workspace changes before confirmation.
7. **Given** a valid Upload offline and replace online preview, **When** the user confirms, **Then** the current online workspace is backed up and replaced completely by the offline workspace while the offline source remains unchanged.
8. **Given** a valid Download online and replace offline preview, **When** the user confirms, **Then** the current offline workspace is backed up and replaced completely by the online workspace while the online source remains unchanged.
9. **Given** synchronization is interrupted or fails, **When** either workspace is reopened, **Then** neither side contains a partial replacement and the previous destination can be recovered.
10. **Given** synchronization has completed, **When** the user later edits offline or online data, **Then** the workspaces remain independent until another explicit synchronization is approved.
11. **Given** the same account is used on another supported web or desktop client, **When** online mode is opened, **Then** the same current online records and managed files are available.
12. **Given** two different accounts, **When** either account requests, modifies, exports, or deletes online workspace data, **Then** it can affect only its own records and files.
13. **Given** an authenticated session, **When** the user signs out or revokes that session, **Then** protected data is no longer accessible through that session.
14. **Given** a user who cannot sign in, **When** password recovery is completed through the verified email address, **Then** the old credentials no longer grant access and existing workspace data remains intact.
15. **Given** the backend cannot be reached, **When** an online operation is attempted, **Then** the client communicates that online mode is unavailable, does not claim that unsaved changes were stored, and leaves offline mode usable.
16. **Given** a user in either mode, **When** the active workspace is exported, **Then** the existing portable package represents that workspace completely and can be retained independently of the service.
17. **Given** an authenticated user who requests account deletion, **When** the request is confirmed and any required reauthentication succeeds, **Then** the account and its private online records and managed files are deleted according to the stated retention policy without deleting the independent offline workspace.
18. **Given** the user is working in Online mode and connectivity is lost, **When** the user views or edits the workspace, **Then** the application uses an account-specific local working copy and clearly marks new changes as pending upload.
19. **Given** Online mode has pending local changes, **When** connectivity returns, **Then** no upload occurs until the user reviews the direction and explicitly approves replacing the online workspace.
20. **Given** the online workspace changed on another client after the local working copy was last current, **When** replacement is previewed, **Then** the user sees a prominent conflict warning and summaries of the local and online versions before deciding which one replaces the other.
21. **Given** the user approves replacing the online workspace with the pending local working copy, **When** synchronization succeeds, **Then** the prior online workspace is recoverably backed up, the complete local working copy becomes online data, and the pending state is cleared.

### Edge Cases

- Registration is repeated for an email address that already has an account.
- Verification or password-recovery links are expired, already used, malformed, or opened on a different device.
- A session expires while the user is viewing or editing a position.
- A desktop authentication callback is malformed, replayed, or received by an unexpected application instance.
- A synchronization source is corrupt, unsupported, internally inconsistent, or contains unsafe paths or file types.
- Synchronization is interrupted after transfer but before replacement, or the same synchronization is submitted more than once.
- Either the source or destination workspace is empty.
- Two authenticated clients update the same position near the same time.
- A resume or logo upload succeeds but its associated record update fails, or the inverse occurs.
- A user signs out or deletes the account while another client still has an older session.
- The backend is unavailable during startup, saving, file access, export, or account deletion.
- A foreign service, payment processor, package registry, or email provider is unavailable from Iran.
- A previously usable infrastructure provider changes regional access or account policy.
- The user switches between Offline and Online modes and could confuse which workspace is active.
- Connectivity fails before an Online-mode edit reaches the backend.
- The application restarts while the Online-mode working copy contains pending changes.
- Another client changes online data while this device has pending local changes.
- The user attempts to sign out while pending Online-mode changes have not been uploaded.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a user to register with an email address and password, verify the email address, sign in, sign out, and recover a forgotten password.
- **FR-002**: Authentication responses MUST avoid revealing whether an account exists when that information is not necessary for the user's next action.
- **FR-003**: The system MUST limit repeated authentication attempts and MUST expire or revoke sessions after security-relevant account events.
- **FR-004**: A user MUST be authenticated before any Online workspace record, managed file, export, or account setting is returned or changed.
- **FR-005**: Every private record and managed file MUST have one owning account, and every protected operation MUST enforce that ownership.
- **FR-006**: Account identifiers MUST NOT be accepted from the client as proof of ownership.
- **FR-007**: The initial release MUST support one private workspace per account and MUST NOT provide sharing, collaboration, organizations, roles, or administrator access to user content.
- **FR-008**: Users MUST be able to use the same account through the supported web application and installed desktop application.
- **FR-009**: Desktop authentication MUST complete through a trusted external sign-in surface and return the result only to the intended installed application.
- **FR-010**: Authentication credentials and reusable session secrets MUST NOT be stored in browser local storage, included in workspace exports, logged, or committed to the repository.
- **FR-011**: Users MUST be able to review and revoke their active sessions, including sessions on another machine.
- **FR-012**: The backend workspace MUST preserve the meaning, stable identities, relationships, ordering, preferences, validation rules, and rich content supported by the current workspace.
- **FR-013**: Submitted resumes and uploaded company logos MUST remain private and MUST be retrievable only by their owning account through time-limited or authenticated access.
- **FR-014**: The system MUST provide two explicit operating modes: Offline and Online.
- **FR-015**: Offline mode MUST use the existing local workspace behavior and Online mode MUST require authentication and use the account's backend workspace.
- **FR-016**: Switching modes MUST NOT automatically copy, merge, upload, download, or delete workspace data.
- **FR-017**: An authenticated user MUST be able to request synchronization in either direction: Upload offline and replace online, or Download online and replace offline.
- **FR-018**: Synchronization MUST validate both workspaces and show the selected direction, source and destination summaries, and replacement effect before confirmation.
- **FR-019**: Synchronization MUST replace the complete destination workspace and MUST NOT merge records from the two workspaces.
- **FR-020**: Concurrent edits MUST be detected before one client overwrites a newer saved version, and the user MUST be given a clear reload-and-retry path.
- **FR-021**: Failed writes or file operations MUST not leave user-visible partial records, broken relationships, or orphaned managed files.
- **FR-022**: Service unavailability MUST preserve the last confirmed view where practical, identify unsaved work clearly, and MUST NOT represent an operation as saved without confirmation.
- **FR-023**: Users MUST retain the existing complete workspace export capability for backup and portability.
- **FR-024**: A user MUST be able to request deletion of the account and all owned remote workspace data after explicit confirmation and recent authentication.
- **FR-025**: The product MUST state what account data is stored, why it is stored, and the applicable deletion and backup-retention behavior before account creation.
- **FR-026**: Authentication and synchronization screens MUST follow the existing compact, dark, quiet, keyboard-operable interface conventions and provide clear loading, empty, success, and failure states.
- **FR-027**: Social sign-in, passwordless sign-in, multi-factor authentication, public profiles, shared workspaces, and background offline synchronization are outside the initial release.
- **FR-028**: Planning and implementation of remote persistence MUST NOT begin until the constitution's local-data principle is amended and explicitly approved.
- **FR-029**: The installed desktop application MUST continue to provide a complete Offline mode that does not require registration, authentication, a network connection, or an active backend service.
- **FR-030**: The interface MUST always make it clear whether the active workspace is Offline or Online before the user creates, edits, imports, exports, synchronizes, or deletes information.
- **FR-031**: Enabling Online mode MUST be an explicit opt-in action and MUST NOT automatically upload an existing offline workspace.
- **FR-032**: Before replacing either workspace, the system MUST create a complete recoverable backup of the destination; replacement MUST stop if that backup cannot be completed.
- **FR-033**: A confirmed synchronization MUST be repeat-safe and atomic from the user's perspective, without duplicate records, duplicate files, or a partially replaced destination.
- **FR-034**: Managed production services MAY be used, but the selected services and payment path MUST be legally and practically available to the owner from Iran.
- **FR-035**: Provider selection MUST include a documented access check from the intended Iranian network and MUST identify any required third-party account, payment method, regional restriction, and recovery path before production use.
- **FR-036**: Loss of any optional external provider MUST NOT prevent the owner from recovering workspace data from documented database, file, or portable workspace backups.
- **FR-037**: Social-login accounts MUST NOT be required; any mandatory payment method and its availability to the owner MUST be identified and approved during planning.
- **FR-038**: After synchronization, Offline and Online workspaces MUST remain independent; continuous or automatic bidirectional synchronization is outside the initial release.
- **FR-039**: Online mode MUST maintain an account-specific local working copy sufficient to view and edit the workspace when the backend becomes unreachable.
- **FR-040**: Changes made to the Online-mode working copy without backend confirmation MUST persist across application restarts and MUST be clearly identified as pending rather than saved online.
- **FR-041**: Restoring connectivity MUST NOT automatically upload, merge, or discard pending changes.
- **FR-042**: The user MUST be able to preview and explicitly approve replacing the online workspace with the pending local working copy.
- **FR-043**: Before approval, the system MUST compare the online workspace with the last confirmed online revision and warn clearly if another client has changed it.
- **FR-044**: A conflict warning MUST show sufficient source, destination, record-count, and last-update information for the user to choose which complete workspace to keep.
- **FR-045**: The user MUST be able to cancel replacement, upload the local working copy and replace online data, or download online data and replace the local working copy; records MUST NOT be merged.
- **FR-046**: Either replacement direction MUST create a complete recoverable backup of the destination before changing it and MUST leave the source unchanged.
- **FR-047**: Successful upload of the local working copy MUST clear its pending state and record the newly confirmed online revision.
- **FR-048**: Signing out with pending changes MUST warn the user and require an explicit decision; one account's local working copy MUST never be exposed to another account.

### Key Entities

- **Account**: The verified identity that owns one private workspace and its account lifecycle state.
- **Session**: A time-bounded, revocable authorization for one browser or installed application instance.
- **Workspace Ownership**: The association ensuring every position, preference, reference item, and managed file belongs to exactly one account.
- **Online Workspace**: The authenticated representation of positions, nested preparation data, ordering, preferences, and reference data stored by the backend.
- **Offline Workspace**: The existing local representation of positions, nested preparation data, ordering, preferences, reference data, and managed files.
- **Managed File**: A private submitted resume or uploaded company logo associated with an owned workspace record.
- **Workspace Mode**: The user's explicit choice of Offline or Online, identifying which workspace is currently visible and editable.
- **Online Working Copy**: The account-specific local representation used by Online mode during loss of connectivity, including its last confirmed online revision and pending-change state.
- **Synchronization Attempt**: A uniquely identified directional replacement operation with source, destination, preview, backups, status, counts, and retry protection.
- **Record Revision**: The value used to detect an attempted overwrite of a newer saved record.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can register, verify the account, and reach an empty private workspace in under five minutes.
- **SC-002**: A returning user can sign in and reach the position list in under one minute on a normal connection.
- **SC-003**: In authorization tests covering every protected operation, zero requests can read or alter another account's records or files.
- **SC-004**: A valid workspace containing 1,000 positions and its supported related records and files replaces the selected destination completely, with all counts and relationships preserved, in under ten minutes on a normal connection.
- **SC-005**: Retrying the same completed or interrupted synchronization produces zero duplicate records and zero duplicate managed files.
- **SC-006**: Changes confirmed on one client are visible after refresh on a second client within five seconds on a normal connection.
- **SC-007**: One hundred percent of stale concurrent-update tests prevent silent overwrites and provide a recovery action.
- **SC-008**: Signing out or revoking a session prevents that session from completing any subsequent protected operation.
- **SC-009**: Offline and online workspace exports remain complete and restorable after synchronization in either direction.
- **SC-010**: Account deletion makes all owned active records and managed files inaccessible within five minutes, with any delayed backup deletion disclosed before confirmation.
- **SC-011**: One hundred percent of existing local workspace acceptance scenarios remain usable with networking disabled and no account configured.
- **SC-012**: In tests of both synchronization directions, one hundred percent of confirmed operations back up and completely replace only the selected destination while leaving the source unchanged.
- **SC-013**: Before production selection, authentication, file access, email delivery, and workspace operations pass their documented checks from the intended Iranian network.
- **SC-014**: A backup recovery exercise restores all tested workspace records and managed files without access to the original hosting provider.
- **SC-015**: In 20 consecutive outage tests, Online mode preserves every confirmed local edit across an application restart without claiming that it was uploaded.
- **SC-016**: In 100 percent of reconnection tests with pending changes, online data remains unchanged until the user explicitly approves a replacement direction.
- **SC-017**: In 100 percent of tests where another client changed online data during an outage, the user sees a conflict warning before either workspace is replaced.

## Assumptions

- The initial audience remains an individual job seeker managing private personal data; there are no shared or organizational workspaces.
- Email and password with email verification and password recovery is the initial authentication method.
- Offline mode remains fully functional without connectivity; Online mode uses an account-specific local working copy during temporary loss of connectivity.
- Offline and Online are separate workspaces selected explicitly by the user.
- Existing offline data is never uploaded automatically; synchronization is an explicit directional replacement with no merge behavior.
- The existing portable ZIP remains the user-controlled backup and transfer format.
- The current web and Windows desktop clients are supported first; macOS packaging is independent of this feature.
- The service will use established identity, database, and private file-storage capabilities rather than custom password, token, or cryptographic implementations.
- Hosting, email, DNS, and file-delivery providers are selected only after verifying current legal availability, network reachability, account access, payment feasibility, and an exit path for the owner in Iran.
- Managed production services are acceptable after their Iran accessibility, account, payment, backup, and exit conditions are reviewed and approved.
- The application keeps the standalone Offline workspace and each account's Online working copy independent except when the user explicitly approves a complete directional replacement.
- This feature requires a separately approved amendment to Constitution Principle V because authenticated remote persistence conflicts with its current local-only requirement.

## Dependencies

- Explicit approval of this specification.
- Explicit approval of an amendment to the project's local-data governance before planning remote persistence.
- Access to an email delivery capability available to the owner and reachable by intended users for verification and password recovery.
- Access to approved backend hosting, a relational data store, private file storage, DNS, and TLS that can be operated from Iran under the selected provider's account and payment requirements.
