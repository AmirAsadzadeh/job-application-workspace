use std::sync::{
    atomic::{AtomicU64, Ordering},
    Mutex,
};
use tauri::{Manager, RunEvent};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_shell::{process::{CommandChild, CommandEvent}, ShellExt};

mod auth;
mod credential_vault;

#[derive(Default)]
struct SidecarState {
    child: Mutex<Option<CommandChild>>,
    generation: AtomicU64,
    bootstrap_url: Mutex<Option<tauri::Url>>,
}

fn readiness_origin(line: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(line);
    let payload = text.strip_prefix("WORKSPACE_READY ")?.trim();
    let value: serde_json::Value = serde_json::from_str(payload).ok()?;
    let origin = value.get("origin")?.as_str()?;
    let url = tauri::Url::parse(origin).ok()?;
    if url.scheme() != "http"
        || url.host_str() != Some("127.0.0.1")
        || url.port().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return None;
    }
    Some(url.origin().ascii_serialization())
}

fn sidecar_arguments(workspace: &std::path::Path, resources: &std::path::Path) -> Vec<String> {
    vec![
        "--desktop".into(),
        "--host=127.0.0.1".into(),
        "--port=0".into(),
        format!("--workspace={}", workspace.display()),
        format!("--resources={}", resources.display()),
        format!("--parent-pid={}", std::process::id()),
    ]
}

fn stop_sidecar(state: &SidecarState) {
    if let Ok(mut guard) = state.child.lock() {
        if let Some(child) = guard.take() {
            let _ = child.kill();
        }
    }
}

fn show_startup_failure(app: &tauri::AppHandle, message: &str) {
    let state = app.state::<SidecarState>();
    let Ok(guard) = state.bootstrap_url.lock() else { return };
    let Some(mut url) = guard.clone() else { return };
    drop(guard);
    url.query_pairs_mut().clear().append_pair("error", message);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.navigate(url);
    }
}

fn launch_sidecar(app: &tauri::AppHandle) -> Result<(), String> {
    let state = app.state::<SidecarState>();
    let generation = state.generation.fetch_add(1, Ordering::SeqCst) + 1;
    stop_sidecar(&state);

    let workspace = app
        .path()
        .app_local_data_dir()
        .map_err(|error| error.to_string())?
        .join("workspace");
    std::fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
    let resources = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?
        .join("desktop-resources");
    let command = app
        .shell()
        .sidecar("workspace-sidecar")
        .map_err(|error| error.to_string())?
        .args(sidecar_arguments(&workspace, &resources));
    let (mut events, child) = command.spawn().map_err(|error| error.to_string())?;
    *state
        .child
        .lock()
        .map_err(|_| "sidecar state is unavailable".to_string())? = Some(child);

    let app_handle = app.clone();
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "main window is unavailable".to_string())?;
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            if app_handle
                .state::<SidecarState>()
                .generation
                .load(Ordering::SeqCst)
                != generation
            {
                break;
            }

            match event {
                CommandEvent::Stdout(line) => {
                    if let Some(origin) = readiness_origin(&line) {
                        if let Ok(url) = origin.parse() {
                            let _ = window.navigate(url);
                        }
                    }
                }
                CommandEvent::Error(message) => {
                    show_startup_failure(&app_handle, &message);
                }
                CommandEvent::Terminated(payload) if payload.code.unwrap_or(1) != 0 => {
                    show_startup_failure(
                        &app_handle,
                        "The local workspace service stopped.",
                    );
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
fn reveal_workspace(app: tauri::AppHandle) -> Result<(), String> {
    let workspace = app.path().app_local_data_dir().map_err(|error| error.to_string())?.join("workspace");
    std::fs::create_dir_all(&workspace).map_err(|error| error.to_string())?;
    app.opener().open_path(workspace.to_string_lossy(), None::<&str>).map_err(|error| error.to_string())
}

#[tauri::command]
fn retry_startup(app: tauri::AppHandle) -> Result<(), String> {
    launch_sidecar(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![reveal_workspace, retry_startup, auth::register_auth_attempt, credential_vault::save_refresh_credential, credential_vault::read_refresh_credential, credential_vault::delete_refresh_credential])
        .manage(SidecarState::default())
        .manage(auth::DesktopAuthState::default())
        .setup(|app| {
            let stronghold_salt = app.path().app_local_data_dir()?.join("stronghold-salt");
            app.handle().plugin(tauri_plugin_stronghold::Builder::with_argon2(&stronghold_salt).build())?;
            auth::register_deep_link_handler(app.handle());
            let window = app.get_webview_window("main").ok_or("main window is unavailable")?;
            *app.state::<SidecarState>()
                .bootstrap_url
                .lock()
                .map_err(|_| "desktop state is unavailable")? = Some(window.url()?);
            if let Err(error) = launch_sidecar(app.handle()) {
                show_startup_failure(app.handle(), &error);
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build desktop application");

    app.run(|handle, event| {
        if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
            stop_sidecar(&handle.state::<SidecarState>());
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn parses_only_loopback_readiness() {
        assert_eq!(readiness_origin(br#"WORKSPACE_READY {"origin":"http://127.0.0.1:4173"}"#).as_deref(), Some("http://127.0.0.1:4173"));
        assert!(readiness_origin(br#"WORKSPACE_READY {"origin":"http://example.com"}"#).is_none());
        assert!(readiness_origin(br#"WORKSPACE_READY {"origin":"http://127.0.0.1:4173@evil.example"}"#).is_none());
        assert!(readiness_origin(br#"WORKSPACE_READY {"origin":"https://127.0.0.1:4173"}"#).is_none());
        assert!(readiness_origin(b"ordinary log").is_none());
    }

    #[test]
    fn builds_required_sidecar_arguments() {
        let args = sidecar_arguments(Path::new(r"C:\Users\Me\data"), Path::new(r"C:\App\resources"));
        assert!(args.contains(&"--desktop".to_string()));
        assert!(args.contains(&"--host=127.0.0.1".to_string()));
        assert!(args.contains(&"--port=0".to_string()));
        assert!(args.iter().any(|arg| arg.starts_with("--workspace=")));
        assert!(args.iter().any(|arg| arg.starts_with("--resources=")));
        assert!(args.iter().any(|arg| arg.starts_with("--parent-pid=")));
    }
}
