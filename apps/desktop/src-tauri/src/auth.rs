use std::{collections::HashSet, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

const CALLBACK_SCHEME: &str = "job-application-workspace";
const MAX_AUTHORIZATION_LIFETIME_MS: u64 = 15 * 60 * 1000;

#[derive(Clone)]
struct PendingAuthorization {
    state: String,
    issuer: String,
    expires_at_epoch_ms: u64,
}

#[derive(Default)]
pub struct DesktopAuthState {
    pending: Mutex<Option<PendingAuthorization>>,
}

fn now_epoch_ms() -> Result<u64, String> {
    Ok(SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| "System clock is unavailable.".to_string())?.as_millis() as u64)
}

#[tauri::command]
pub fn register_auth_attempt(app: AppHandle, state: String, issuer: String, expires_at_epoch_ms: u64) -> Result<(), String> {
    if state.len() < 32 || state.len() > 256 || !state.bytes().all(|value| value.is_ascii_alphanumeric() || value == b'-' || value == b'_') {
        return Err("Authorization state is invalid.".into());
    }
    let issuer_url = tauri::Url::parse(&issuer).map_err(|_| "Authorization issuer is invalid.".to_string())?;
    if issuer_url.scheme() != "https" || issuer_url.host_str().is_none() || issuer_url.query().is_some() || issuer_url.fragment().is_some() {
        return Err("Authorization issuer is invalid.".into());
    }
    let now = now_epoch_ms()?;
    if expires_at_epoch_ms <= now || expires_at_epoch_ms > now + MAX_AUTHORIZATION_LIFETIME_MS {
        return Err("Authorization expiry is invalid.".into());
    }
    *app.state::<DesktopAuthState>().pending.lock().map_err(|_| "Authorization state is unavailable.".to_string())? = Some(PendingAuthorization { state, issuer: issuer_url.as_str().trim_end_matches('/').to_string(), expires_at_epoch_ms });
    Ok(())
}

fn validate_callback(app: &AppHandle, url: &tauri::Url) -> Result<(), String> {
    if url.scheme() != CALLBACK_SCHEME || url.host_str() != Some("auth") || url.path() != "/callback" || url.fragment().is_some() {
        return Err("The sign-in callback address is invalid.".into());
    }
    let mut names = HashSet::new();
    let mut state = None;
    let mut issuer = None;
    let mut code = None;
    let mut remote_error = None;
    for (name, value) in url.query_pairs() {
        if !names.insert(name.to_string()) { return Err("The sign-in callback contains duplicate parameters.".into()); }
        match name.as_ref() {
            "state" => state = Some(value.to_string()),
            "iss" => issuer = Some(value.trim_end_matches('/').to_string()),
            "code" => code = Some(value.to_string()),
            "error" => remote_error = Some(value.to_string()),
            _ => {}
        }
    }
    if code.is_some() == remote_error.is_some() { return Err("The sign-in callback result is invalid.".into()); }
    let auth_state = app.state::<DesktopAuthState>();
    let mut pending = auth_state.pending.lock().map_err(|_| "Authorization state is unavailable.".to_string())?;
    let expected = pending.as_ref().ok_or_else(|| "There is no active sign-in request.".to_string())?;
    if expected.expires_at_epoch_ms <= now_epoch_ms()? { *pending = None; return Err("The sign-in request expired.".into()); }
    if state.as_deref() != Some(expected.state.as_str()) { return Err("The sign-in callback state is invalid.".into()); }
    if issuer.as_deref() != Some(expected.issuer.as_str()) { return Err("The sign-in callback issuer is invalid.".into()); }
    *pending = None;
    Ok(())
}

pub fn register_deep_link_handler(app: &AppHandle) {
    let handle = app.clone();
    app.deep_link().on_open_url(move |event| {
        for url in event.urls() {
            match validate_callback(&handle, &url) {
                Ok(()) => { let _ = handle.emit("desktop-auth-callback", url.as_str()); }
                Err(message) => { let _ = handle.emit("desktop-auth-error", message); }
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn callback_shape_requires_the_exact_registered_location() {
        let valid = tauri::Url::parse("job-application-workspace://auth/callback?code=x&state=y&iss=https%3A%2F%2Fexample.test").unwrap();
        assert_eq!(valid.scheme(), CALLBACK_SCHEME);
        assert_eq!(valid.host_str(), Some("auth"));
        assert_eq!(valid.path(), "/callback");
        let invalid = tauri::Url::parse("job-application-workspace://evil/callback").unwrap();
        assert_ne!(invalid.host_str(), Some("auth"));
    }
}
