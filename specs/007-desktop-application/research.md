# Research: Desktop Application

## Decision 1: Use Tauri 2 as the Desktop Shell

**Decision**: Add a Tauri 2 shell around the existing React application and target 64-bit Windows with WebView2.

**Rationale**: Tauri supports the existing web frontend, creates native Windows installers, relies on the operating system WebView, and provides narrowly scoped native capabilities. The current machine needs Rust and Microsoft C++ Build Tools installed before implementation; end users do not need those build tools.

**Alternatives considered**: Electron would reuse Node directly but bundle a full browser runtime and create a larger distribution. A static HTML build cannot retain unrestricted local JSON, resume, logo, and ZIP workflows. Continuing with `npm start` does not satisfy the approved launch journey.

**Sources**: [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), [Tauri security model](https://v2.tauri.app/security/)

## Decision 2: Preserve the Existing Backend as a Sidecar

**Decision**: Package the current Node server into a self-contained executable and launch it as a Tauri sidecar.

**Rationale**: The current server and related modules contain roughly 950 lines of tested persistence, file validation, resume, and workspace-package behavior. Tauri officially supports Node applications as sidecars. Retaining the server keeps the existing API and automated tests authoritative and limits regression risk.

**Alternatives considered**: Rewriting the repository and ZIP behavior in Rust would duplicate mature domain logic and substantially expand the journey. Exposing broad filesystem access directly to the webview would weaken the security boundary and require major frontend changes.

**Sources**: [Node.js as a Tauri sidecar](https://v2.tauri.app/learn/sidecar-nodejs/), [embedding external binaries](https://v2.tauri.app/develop/sidecar/)

## Decision 3: Build the Sidecar as a Node Single Executable

**Decision**: Bundle the TypeScript server and JavaScript dependencies into a single CommonJS file and inject it into a Windows Node single-executable application for the Tauri external binary.

**Rationale**: End users must not need Node.js installed. Node's single-executable application feature supports distributing a bundled application without an external Node installation, and Tauri handles bundling target-specific sidecar binaries.

**Alternatives considered**: Shipping `node.exe` plus readable JavaScript resources is simpler but increases loose packaged resources. The legacy `pkg` path shown in Tauri's example adds another packaging abstraction. Requiring Node on the destination computer violates the normal desktop-install experience.

**Sources**: [Node.js single-executable applications](https://nodejs.org/api/single-executable-applications.html), [Tauri Node sidecar guide](https://v2.tauri.app/learn/sidecar-nodejs/)

## Decision 4: Store Data in the Per-User Local Application Directory

**Decision**: Place the workspace beneath `%LOCALAPPDATA%/com.amirasadzadeh.job-application-workspace/workspace/` and expose a compact action that reveals it in Explorer.

**Rationale**: Installed program/resource directories are not reliable writable locations. Tauri's application-local data path is bundle-identifier-specific, writable per user, and survives application replacement. This satisfies both local ownership and update persistence.

**Alternatives considered**: Writing beside the executable can fail under protected installation directories. Documents/Desktop are more visible but clutter user-managed folders and increase accidental modification. A hidden database violates the human-readable JSON requirement.

**Sources**: [Tauri path API](https://v2.tauri.app/reference/javascript/api/namespacepath/), [Tauri filesystem guidance](https://v2.tauri.app/plugin/file-system/)

## Decision 5: Use Native Openers and Dialogs with Narrow Permissions

**Decision**: Use native opener and dialog integrations for external URLs, revealing the data folder, and choosing import/export paths. Scope capabilities to the main window and local application origin.

**Rationale**: Desktop webviews should not receive arbitrary shell or filesystem authority. Tauri capabilities make these privileges explicit, while the opener supports the default browser and Explorer and native dialogs provide familiar file selection.

**Alternatives considered**: General shell execution is unnecessarily broad. Browser download links do not provide a reliable native save flow inside a desktop webview. Direct frontend filesystem permissions would expose more than the UI needs.

**Sources**: [Tauri opener](https://v2.tauri.app/plugin/opener/), [Tauri dialog](https://v2.tauri.app/plugin/dialog/), [Tauri permissions](https://v2.tauri.app/security/permissions/)

## Decision 6: Produce a Per-User NSIS Installer

**Decision**: Build one unsigned x64 NSIS `-setup.exe` installer using per-user installation for the first release.

**Rationale**: Tauri supports NSIS setup executables, and per-user installation avoids administrator rights and installs under the user's local application area. It also avoids the optional Windows VBSCRIPT prerequisite associated with MSI creation.

**Alternatives considered**: MSI adds a build prerequisite and offers little value for a private first release. A portable executable complicates lifecycle, shortcuts, and update/reinstall expectations. Per-machine installation unnecessarily requests elevation.

**Sources**: [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/)

## Decision 7: Enforce One Application Instance

**Decision**: Use the supported single-instance integration; a second launch focuses the existing primary window.

**Rationale**: One writer process aligns with the existing write queue and avoids multiple sidecars competing for the same JSON files.

**Alternatives considered**: Multiple windows would require cross-process locking and conflict handling outside this journey. Detecting only port conflicts does not reliably focus the existing window.

**Sources**: [Tauri single-instance plugin](https://v2.tauri.app/plugin/single-instance/)
