use keyring::Entry;
use rand::{rngs::OsRng, RngCore};
use tauri::Manager;
use tauri_plugin_stronghold::stronghold::Stronghold;
use zeroize::Zeroize;

const KEYRING_SERVICE: &str = "com.amirasadzadeh.job-application-workspace";
const KEYRING_ACCOUNT: &str = "stronghold-snapshot-key";
const CLIENT: &[u8] = b"desktop-oauth";

fn generic_error() -> String {
    "The protected credential store is unavailable.".into()
}

fn master_key() -> Result<Vec<u8>, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_ACCOUNT).map_err(|_| generic_error())?;
    match entry.get_secret() {
        Ok(secret) if secret.len() == 32 => Ok(secret),
        Ok(_) => Err(generic_error()),
        Err(keyring::Error::NoEntry) => {
            let mut secret = vec![0_u8; 32];
            OsRng.fill_bytes(&mut secret);
            entry.set_secret(&secret).map_err(|_| generic_error())?;
            Ok(secret)
        }
        Err(_) => Err(generic_error()),
    }
}

fn record_key(account_id: &str, issuer: &str) -> Result<String, String> {
    if account_id.trim().is_empty() || account_id.len() > 256 { return Err("The credential account is invalid.".into()); }
    let issuer_url = tauri::Url::parse(issuer).map_err(|_| "The credential issuer is invalid.".to_string())?;
    if issuer_url.scheme() != "https" || issuer_url.host_str().is_none() || issuer_url.query().is_some() || issuer_url.fragment().is_some() {
        return Err("The credential issuer is invalid.".into());
    }
    Ok(format!("{}|{}", issuer_url.as_str().trim_end_matches('/'), account_id))
}

fn with_vault<T>(app: &tauri::AppHandle, action: impl FnOnce(&Stronghold, iota_stronghold::Client) -> Result<T, String>) -> Result<T, String> {
    let path = app.path().app_local_data_dir().map_err(|_| generic_error())?.join("oauth-credentials.stronghold");
    let mut key = master_key()?;
    let stronghold = Stronghold::new(path, key.clone()).map_err(|_| generic_error())?;
    key.zeroize();
    let client = stronghold.load_client(CLIENT).or_else(|_| stronghold.create_client(CLIENT)).map_err(|_| generic_error())?;
    let result = action(&stronghold, client)?;
    stronghold.save().map_err(|_| generic_error())?;
    Ok(result)
}

#[tauri::command]
pub fn save_refresh_credential(app: tauri::AppHandle, account_id: String, issuer: String, mut credential: String) -> Result<(), String> {
    let key = record_key(&account_id, &issuer)?;
    let result = with_vault(&app, |_stronghold, client| client.store().insert(key.as_bytes().to_vec(), credential.as_bytes().to_vec(), None).map(|_| ()).map_err(|_| generic_error()));
    credential.zeroize();
    result
}

#[tauri::command]
pub fn read_refresh_credential(app: tauri::AppHandle, account_id: String, issuer: String) -> Result<Option<String>, String> {
    let key = record_key(&account_id, &issuer)?;
    with_vault(&app, |_stronghold, client| {
        let value = client.store().get(key.as_bytes()).map_err(|_| generic_error())?;
        value.map(String::from_utf8).transpose().map_err(|_| generic_error())
    })
}

#[tauri::command]
pub fn delete_refresh_credential(app: tauri::AppHandle, account_id: String, issuer: String) -> Result<(), String> {
    let key = record_key(&account_id, &issuer)?;
    with_vault(&app, |_stronghold, client| client.store().delete(key.as_bytes()).map(|_| ()).map_err(|_| generic_error()))
}
