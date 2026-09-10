# Sidecar Runtime Contract

## Startup Inputs

The desktop shell supplies these values as process arguments rather than relying on the current working directory:

| Argument | Required | Meaning |
|---|---:|---|
| `--desktop` | Yes | Enables packaged lifecycle behavior |
| `--host=127.0.0.1` | Yes | Restricts listening to loopback |
| `--port=0` | Yes | Requests an ephemeral available port |
| `--workspace=<absolute-path>` | Yes | Writable per-user workspace root |
| `--resources=<absolute-path>` | Yes | Read-only packaged resource root |
| `--parent-pid=<number>` | Yes | Owning desktop process identifier |

Unknown arguments or missing required desktop arguments cause startup failure before any workspace write.

## Readiness Output

After successful initialization and listening, stdout emits exactly one line suitable for machine parsing:

```text
WORKSPACE_READY {"origin":"http://127.0.0.1:<port>"}
```

Rules:

- The readiness line is emitted only after the server can accept requests.
- The selected port must be non-zero and supplied by the listening socket.
- Diagnostic logs must not use the `WORKSPACE_READY ` prefix.
- Startup errors go to stderr and return a non-zero exit code.

## HTTP Compatibility

- Existing `/api` request and response contracts remain unchanged.
- Existing static routes and single-page navigation fallback remain unchanged.
- Runtime company logos and resumes resolve from the configured workspace root.
- Bundled fallback logos and frontend assets resolve from the configured resource root.

## Lifecycle

- The sidecar exits cleanly when the desktop shell closes its control channel or requests shutdown.
- The sidecar periodically verifies the supplied parent process and exits if it is gone.
- A fatal uncaught error returns a non-zero exit code.
- Temporary workspace-transfer files are cleaned through the existing transfer lifecycle.
