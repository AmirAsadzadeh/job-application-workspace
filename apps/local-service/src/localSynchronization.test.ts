import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "./index.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "local-sync-route-"));
  roots.push(root);
  const project = join(root, "project");
  const templates = join(project, "data");
  await mkdir(templates, { recursive: true });
  await writeFile(join(templates, "positions.example.json"), JSON.stringify({ version: 6, listView: { mode: "manual", column: null, direction: null }, positions: [] }));
  await writeFile(join(templates, "reference-data.example.json"), JSON.stringify({ version: 1, departments: [], locations: [] }));
  return startServer({ projectRoot: project, workspacePath: join(root, "workspace"), production: true, port: 0, log: () => undefined });
}

describe("explicit local synchronization routes", () => {
  it("replaces one account working copy without changing Offline data", async () => {
    const started = await fixture();
    try {
      const create = await fetch(`${started.origin}/api/positions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyName: "Acme", companyLogo: { kind: "none" }, title: "Engineer", workMode: "remote", seniority: "Senior", employmentType: "full_time", departmentId: null, teamId: null, locationId: null, hiringManager: { name: "", phone: "", position: "" }, salary: null, jobPlatformLinks: [], careerPageUrl: null, careerPageApplicationStatus: null, careerPageApplicationDate: null, description: { type: "doc", content: [{ type: "paragraph" }] } }),
      });
      expect(create.status).toBe(201);

      const exported = await fetch(`${started.origin}/api/synchronizations/local/export?source=offline`);
      expect(exported.status).toBe(200);
      const archive = await exported.arrayBuffer();
      const query = "target=working_copy&accountId=account-a&remoteRevision=7";
      const previewResponse = await fetch(`${started.origin}/api/synchronizations/local/import?${query}`, { method: "PUT", headers: { "content-type": "application/zip", "x-workspace-filename": "offline.zip" }, body: archive });
      const preview = await previewResponse.json();
      expect(previewResponse.status).toBe(200);
      expect(preview.destination.counts.positions).toBe(0);

      const restored = await fetch(`${started.origin}/api/synchronizations/local/import/${preview.importId}/restore?${query}`, { method: "POST" });
      expect(restored.status).toBe(200);
      await fetch(`${started.origin}/api/workspace/mode`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "online", accountId: "account-a" }) });
      expect((await (await fetch(`${started.origin}/api/positions`)).json()).positions).toHaveLength(1);
      const pending = await (await fetch(`${started.origin}/api/workspace/pending`)).json();
      expect(pending.sync).toMatchObject({ lastConfirmedRemoteRevision: 7, pending: false });

      await fetch(`${started.origin}/api/workspace/mode`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "offline", accountId: null }) });
      expect((await (await fetch(`${started.origin}/api/positions`)).json()).positions).toHaveLength(1);
    } finally {
      await new Promise<void>((resolve, reject) => started.server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
