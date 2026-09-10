/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKSPACE_MODE?: "offline" | "online";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
