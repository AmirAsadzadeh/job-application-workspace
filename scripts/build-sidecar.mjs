import { execFileSync } from "node:child_process";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildDirectory = join(root, "build");
const binaryDirectory = join(root, "src-tauri", "binaries");
const resourceDirectory = join(root, "desktop-resources");
const bundledEntry = join(buildDirectory, "sidecar.cjs");
const blobPath = join(buildDirectory, "sidecar.blob");
const binaryPath = join(binaryDirectory, "workspace-sidecar-x86_64-pc-windows-msvc.exe");
const postject = join(root, "node_modules", "postject", "dist", "cli.js");

async function markAsWindowsGui(binary) {
  const bytes = await readFile(binary);
  const peOffset = bytes.readUInt32LE(0x3c);
  if (bytes.toString("ascii", peOffset, peOffset + 4) !== "PE\0\0") {
    throw new Error("Sidecar is not a valid Windows PE executable.");
  }
  const optionalHeaderOffset = peOffset + 24;
  const magic = bytes.readUInt16LE(optionalHeaderOffset);
  if (magic !== 0x10b && magic !== 0x20b) {
    throw new Error("Sidecar has an unsupported Windows optional header.");
  }
  const subsystemOffset = optionalHeaderOffset + 68;
  const subsystem = bytes.readUInt16LE(subsystemOffset);
  if (subsystem !== 2 && subsystem !== 3) {
    throw new Error(`Sidecar has an unsupported Windows subsystem: ${subsystem}.`);
  }
  bytes.writeUInt16LE(2, subsystemOffset);
  await writeFile(binary, bytes);
}

await rm(buildDirectory, { recursive: true, force: true });
await rm(resourceDirectory, { recursive: true, force: true });
await mkdir(buildDirectory, { recursive: true });
await mkdir(binaryDirectory, { recursive: true });
await mkdir(resourceDirectory, { recursive: true });

await build({
  entryPoints: [join(root, "server", "sidecar.ts")],
  outfile: bundledEntry,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  external: ["vite"],
  sourcemap: false,
  minify: false,
});

execFileSync(process.execPath, ["--experimental-sea-config", join(root, "scripts", "sea-config.json")], { cwd: root, stdio: "inherit" });
await copyFile(process.execPath, binaryPath);

try {
  execFileSync("signtool", ["remove", "/s", binaryPath], { stdio: "ignore" });
} catch {
  // The unsigned first release does not require signtool to be installed.
}

execFileSync(process.execPath, [
  postject,
  binaryPath,
  "NODE_SEA_BLOB",
  blobPath,
  "--sentinel-fuse",
  "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2",
  "--overwrite",
], { cwd: root, stdio: "inherit" });

await markAsWindowsGui(binaryPath);

await cp(join(root, "dist"), join(resourceDirectory, "dist"), { recursive: true });
await copyFile(join(root, "data", "positions.example.json"), join(resourceDirectory, "positions.example.json"));
await copyFile(join(root, "data", "reference-data.example.json"), join(resourceDirectory, "reference-data.example.json"));

console.log(`Desktop sidecar: ${binaryPath}`);
console.log(`Desktop resources: ${resourceDirectory}`);
