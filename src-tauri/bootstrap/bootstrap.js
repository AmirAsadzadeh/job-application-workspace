const status = document.querySelector("#status");
const actions = document.querySelector("#actions");

window.desktopStartupFailed = (message) => {
  status.textContent = message || "Could not open the local workspace.";
  actions.hidden = false;
};

const startupError = new URLSearchParams(location.search).get("error");
if (startupError) window.desktopStartupFailed(startupError);

document.querySelector("#retry").addEventListener("click", async () => {
  status.textContent = "Opening your workspace...";
  actions.hidden = true;

  try {
    await window.__TAURI_INTERNALS__?.invoke("retry_startup");
  } catch (error) {
    window.desktopStartupFailed(String(error || "Could not restart the local workspace."));
  }
});
document.querySelector("#open-data").addEventListener("click", () => window.__TAURI_INTERNALS__?.invoke("reveal_workspace"));
document.querySelector("#close").addEventListener("click", () => window.close());
