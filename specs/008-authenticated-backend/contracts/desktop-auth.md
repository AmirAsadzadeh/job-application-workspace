# Desktop Authentication Contract

## Purpose

Authenticate the installed Tauri application without embedding a reusable client secret or persisting credentials in browser storage.

## Client Registration

- Client type: public native application
- Grant: Authorization Code
- PKCE: required, S256 only
- Refresh tokens: allowed through `offline_access`
- Redirect URI: exact installed-app deep link, for example `job-application-workspace://auth/callback`
- Scopes: `openid`, `profile`, `email`, `offline_access`, `workspace`
- Dynamic client registration: disabled

The production redirect URI and application identifier are fixed in configuration and installer metadata. Development uses a separately registered redirect URI/client identity.

## Start Flow

1. Tauri generates cryptographically random `state` and PKCE verifier values.
2. It stores the verifier and state in protected temporary application state, never JSON or browser storage.
3. It derives an S256 code challenge.
4. It opens the authorization URL in the operating system's default browser.
5. The authorization service displays the first-party sign-in/registration page over HTTPS.

Required authorization parameters:

```text
response_type=code
client_id=<registered-public-client>
redirect_uri=<exact-deep-link>
scope=openid profile email offline_access workspace
state=<random-value>
code_challenge=<s256-value>
code_challenge_method=S256
```

## Callback Flow

The installed application accepts only the configured scheme, host, and callback path. It rejects callbacks with missing/duplicate parameters, mismatched state, unexpected issuer, an error response that cannot be correlated to the active request, or no active sign-in attempt.

Successful callback parameters:

```text
job-application-workspace://auth/callback?code=<authorization-code>&state=<original-state>&iss=<expected-issuer>
```

The app exchanges the code at the HTTPS token endpoint with the original verifier and exact redirect URI. The desktop app is a public client and sends no client secret.

## Credential Storage

- Refresh credential: Tauri Stronghold, keyed by issuer and account ID.
- Access token: memory only.
- ID token: memory only unless a minimal non-secret profile projection is required locally.
- PKCE verifier/state: protected temporary state deleted after success, failure, cancellation, or expiry.
- Workspace JSON: contains no tokens, cookies, password material, or PKCE values.

## Session Behavior

- Startup may use a protected refresh credential to obtain a fresh access token.
- Refresh failure locks Online mode but does not block Offline mode.
- Sign-out revokes the remote session when reachable and always removes local credentials.
- Sign-out with pending Online working-copy changes requires an explicit upload, discard, or cancel decision before credentials are removed.
- Revocation from another device causes the next API/refresh request to fail closed.

## Security Verification

- Test code interception with a wrong verifier.
- Test callback replay and reused authorization code.
- Test mismatched state, issuer, redirect URI, and client ID.
- Test a second application instance receiving the callback through Tauri single-instance handling.
- Verify no credential appears in local JSON, logs, ZIP exports, crash output, or frontend storage.
