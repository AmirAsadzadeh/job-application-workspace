import { startServer } from "./index.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

startServer({
  projectRoot: resolve(repositoryRoot, "apps/web"),
  workspacePath: resolve(repositoryRoot, "data"),
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
