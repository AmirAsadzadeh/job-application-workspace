import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { createDatabase } from "./connection.js";

export async function createIsolatedTestDatabase(connectionString: string) {
  const schemaName = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = createDatabase(connectionString);
  await admin.db.execute(sql.raw(`create schema "${schemaName}"`));
  const url = new URL(connectionString);
  url.searchParams.set("options", `-c search_path=${schemaName}`);
  const database = createDatabase(url.toString());
  await database.migrate();
  return {
    ...database,
    schemaName,
    async dispose() {
      await database.close();
      await admin.db.execute(sql.raw(`drop schema if exists "${schemaName}" cascade`));
      await admin.close();
    },
  };
}
