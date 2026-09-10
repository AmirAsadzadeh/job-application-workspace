# Data Model: Desktop Application

The position and workspace package schemas remain unchanged. This feature changes where runtime files live and introduces desktop runtime configuration, not new job-application records.

## Desktop Installation

| Field | Meaning | Rule |
|---|---|---|
| applicationId | Stable desktop bundle identifier | `com.amirasadzadeh.job-application-workspace` |
| version | Installed application version | Matches the packaged release |
| architecture | Supported processor target | Windows x64 for the first release |
| installScope | Installer ownership | Current user only |
| executablePath | Installed shell executable | Read-only application location |

The installation never contains private runtime records. Replacing or removing installation files does not mutate the workspace data folder.

## Workspace Data Folder

| Relative path | Purpose | Lifecycle |
|---|---|---|
| `positions.json` | Canonical position records and list preference | Created from empty template; atomically updated |
| `reference-data.json` | Selectable reference values | Created from bundled template; user-owned afterward |
| `resumes/` | Submitted resume files | Created when first needed |
| `company-logos/` | Uploaded company logos | Created when first needed |
| `backups/` | Pre-import recovery snapshots | Managed by workspace import |
| `.workspace-transfer/` | Temporary import/export sessions | Cleaned after completion or expiry |

**Root on Windows**: `%LOCALAPPDATA%/com.amirasadzadeh.job-application-workspace/workspace/`

**Validation rules**:

- Runtime files must pass the existing versioned schemas before use.
- Missing canonical JSON files are initialized from bundled empty templates.
- Invalid existing files are reported and preserved; they are not silently replaced.
- All canonical JSON writes retain the existing queued, atomic-write behavior.
- Packaged resources may contain templates but never runtime records or user uploads.

## Desktop Runtime Configuration

| Field | Source | Rule |
|---|---|---|
| workspacePath | Desktop shell | Absolute path within the current user's local application directory |
| resourcePath | Desktop shell | Read-only packaged templates and frontend assets |
| host | Fixed runtime value | `127.0.0.1` only |
| port | Operating system | Ephemeral available port selected at startup |
| parentProcessId | Desktop shell | Used to stop an orphaned sidecar |
| mode | Desktop shell | Production desktop mode |

Runtime configuration exists only for the process lifetime and is not added to the position JSON schema.

## State Transitions

```text
Not installed -> Installed -> Launching -> Ready -> Closing -> Installed
                               |             |
                               +-> Failed <--+

No workspace -> Empty initialized -> Active workspace
Existing valid workspace ------------> Active workspace
Existing invalid workspace ----------> Recovery required (files preserved)
```

## Migration

The source-code-run workspace and installed desktop workspace intentionally have separate data roots. Migration uses the existing ZIP contract:

1. Export a ZIP from the current application.
2. Launch the installed desktop application with an empty or existing workspace.
3. Import, validate, preview, and confirm the ZIP.
4. Preserve the automatic pre-import backup and existing restore guarantees.
