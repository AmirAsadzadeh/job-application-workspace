import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "./index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe("workspace request routing", () => {
  it("keeps Offline and account-specific Online records isolated across mode changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "workspace-routing-"));
    roots.push(root);
    const templates = join(root, "project", "data");
    await mkdir(templates, { recursive: true });
    await writeFile(join(templates, "positions.example.json"), JSON.stringify({ version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }));
    await writeFile(join(templates, "reference-data.example.json"), JSON.stringify({ version: 1, departments: [], locations: [] }));
    const started = await startServer({ projectRoot: join(root, "project"), workspacePath: join(root, "workspace"), production: true, port: 0, log: () => undefined });
    try {
      const mode = (selectedMode: "offline" | "online", accountId: string | null) => fetch(`${started.origin}/api/workspace/mode`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: selectedMode, accountId }) });
      await mode("online", "account-a");
      const created = await fetch(`${started.origin}/api/positions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ companyName: "Acme", companyLogo: { kind: "none" }, title: "Engineer", workMode: "remote", seniority: "Senior", employmentType: "full_time", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } }) });
      expect(created.status).toBe(201);
      await mode("offline", null);
      expect((await (await fetch(`${started.origin}/api/positions`)).json()).positions).toHaveLength(0);
      await mode("online", "account-a");
      expect((await (await fetch(`${started.origin}/api/positions`)).json()).positions).toHaveLength(1);
      await mode("online", "account-b");
      expect((await (await fetch(`${started.origin}/api/positions`)).json()).positions).toHaveLength(0);
    } finally {
      await new Promise<void>((resolve, reject) => started.server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
