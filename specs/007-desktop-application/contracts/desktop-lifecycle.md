# Desktop Lifecycle Contract

## Launch

1. Only one primary application instance may own the workspace.
2. A repeated launch focuses the existing window and exits the new process.
3. The primary process resolves the per-user workspace and packaged resource paths.
4. The backend sidecar starts on loopback using an operating-system-selected port.
5. The application window remains on a neutral loading state until backend readiness.
6. Readiness navigates the primary window to the workspace URL.
7. Failure shows a concise error with Retry, Open data folder, and Close actions.

## Shutdown

- Closing the final window requests graceful backend shutdown.
- The shell waits briefly, then terminates an unresponsive sidecar.
- The backend must stop when its owning desktop process no longer exists.
- Shutdown never deletes workspace files or backups.

## Native Actions

### Open External URL

- Accept only complete `http://` or `https://` URLs already validated by product schemas.
- Open the URL in the operating system's default browser.
- Reject unsupported protocols and malformed values.

### Reveal Workspace Folder

- Reveal the exact configured workspace data directory in Windows Explorer.
- Create the directory first when it is legitimately absent.
- Do not accept a caller-supplied arbitrary path.

### Import Workspace

- Display a native file picker restricted to ZIP files.
- Pass the selected file through the existing validation and preview process.
- Cancellation leaves the current workspace unchanged.

### Export Workspace

- Build the package using the existing export contract.
- Display a native save dialog with the generated filename.
- Cancellation removes temporary output and leaves workspace data unchanged.

## Permission Boundary

- Desktop actions are available only to the primary window and local packaged application origin.
- Frontend code receives no arbitrary command execution permission.
- Frontend code receives no unrestricted filesystem path permission.
- The backend binds only to IPv4 loopback and refuses non-local host/origin requests.
