import { formatWorkspaceReady, parseDesktopArguments, watchParentProcess } from "./desktopRuntime.js";
import { startServer } from "./index.js";

async function run() {
  const options = parseDesktopArguments(process.argv.slice(2));
  const { server, origin } = await startServer({
    workspacePath: options.workspacePath,
    resourcesPath: options.resourcesPath,
    host: options.host,
    port: options.port,
    production: true,
    desktop: true,
    log: () => undefined,
  });
  process.stdout.write(formatWorkspaceReady(origin));

  let closing = false;
  const close = () => {
    if (closing) return;
    closing = true;
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 3_000).unref();
  };
  const stopWatching = watchParentProcess(options.parentProcessId, close);
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  server.once("close", stopWatching);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
