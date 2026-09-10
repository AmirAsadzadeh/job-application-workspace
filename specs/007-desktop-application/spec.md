# Feature Specification: Desktop Application

**Feature Branch**: `007-desktop-application`

**Created**: 2026-09-09

**Status**: Approved

**Input**: Package the job application workspace as a desktop application that can be launched normally without manually running `npm start`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Launch and Use the Desktop Workspace (Priority: P1)

As the workspace owner, I want to install and launch the application from Windows like a normal desktop program so that I can use all existing job-tracking features without opening a terminal or starting a development server.

**Why this priority**: Removing the command-line startup requirement is the purpose of this feature. The desktop version is useful only if it preserves the current workflows and local ownership of data.

**Independent Test**: Install the application on a supported Windows computer, launch it from its installed shortcut, create and update a position, close the application, reopen it, and confirm that the saved information remains available without running a separate command.

**Acceptance Scenarios**:

1. **Given** the application is not installed, **When** the user completes the installer, **Then** the application is available from the normal Windows application launcher.
2. **Given** the application is installed, **When** the user launches it, **Then** the workspace opens without requiring a terminal, development server, or browser address.
3. **Given** the desktop workspace is open, **When** the user creates or edits a position, **Then** the change is saved to local, human-readable workspace data.
4. **Given** the user has saved data and closes the application, **When** the application is reopened, **Then** all saved positions, questions, reading items, resumes, logos, ordering, and preferences remain available.
5. **Given** the user has a ZIP export from the existing workspace, **When** the user imports it through the desktop application, **Then** the same validation, preview, backup, and restore behavior is available.
6. **Given** the user selects an external job or career-page link, **When** the link is opened, **Then** it opens in the computer's default browser.

### Edge Cases

- The application starts with no existing workspace data.
- The local data folder is missing and must be created on first launch.
- The local data folder or one of its files cannot be read or written.
- Existing workspace data is invalid or from an unsupported future version.
- A resume or company logo referenced by a position is missing.
- The user attempts to open a second application window while one instance is already running.
- An application update or reinstall occurs while local workspace data already exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an installable desktop application for supported Windows computers.
- **FR-002**: Users MUST be able to launch the installed workspace without manually starting a server, entering a command, or navigating to a local web address.
- **FR-003**: The desktop application MUST preserve all currently supported position-list, position-detail, application, question, reading, resume, logo, sorting, import, and export workflows.
- **FR-004**: Persistent workspace records MUST remain in local, human-readable JSON files and MUST NOT use browser local storage.
- **FR-005**: Private runtime data MUST be stored in a writable, per-user application data folder outside the installed program files.
- **FR-006**: Users MUST be able to locate their workspace data folder from within the application.
- **FR-007**: First launch with no existing data MUST create a valid empty workspace automatically.
- **FR-008**: Existing users MUST be able to move their data to the desktop application by importing a ZIP package exported from the current application.
- **FR-009**: Reinstalling or updating the application MUST preserve existing workspace data.
- **FR-010**: Uninstalling the application MUST NOT silently delete the user's workspace data.
- **FR-011**: External web links MUST open in the operating system's default browser rather than inside the application window.
- **FR-012**: The application MUST present a clear recovery message when local workspace files cannot be read, written, or validated, without overwriting the affected files.
- **FR-013**: The distributed application MUST exclude development tools, mock data, test data, and the user's private workspace records.
- **FR-014**: The first release MUST support 64-bit Windows 10 and Windows 11.
- **FR-015**: Automatic application updates and macOS or Linux packages are outside the scope of this journey.

### Key Entities

- **Desktop Installation**: The installed application, launcher entry, version, and executable files; it does not own or contain the user's private records.
- **Workspace Data Folder**: The per-user local directory containing position JSON, reference data, resumes, company logos, and backups.
- **Workspace Package**: The existing portable ZIP export used to transfer or restore complete workspace data.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can install and open the workspace from Windows in under three minutes without using a terminal.
- **SC-002**: The application shows its usable first screen within five seconds on a supported computer under normal local conditions.
- **SC-003**: One hundred percent of the existing core workflows covered by automated acceptance tests remain usable in the desktop application.
- **SC-004**: Data created before closing the application is present and unchanged after 20 consecutive close-and-reopen checks.
- **SC-005**: A workspace ZIP exported by the current application can be imported into the desktop application with all supported records and files preserved.
- **SC-006**: A user can open the local workspace data folder from the application in no more than two actions.

## Assumptions

- The first release is for the user's current 64-bit Windows environment.
- Migration from the current project-run application uses the existing ZIP export and import workflow rather than automatic discovery of a source-code checkout.
- The desktop application remains a private, single-user, offline-first workspace with no account or cloud synchronization.
- The application uses one primary window; launching it again focuses or reuses the existing instance.
- Code signing, automatic updates, and public app-store distribution are not required for the first release.
