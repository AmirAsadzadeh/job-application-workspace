import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { fileURLToPath } from "node:url";
import * as schema from "./schema/index.js";

export function createDatabase(connectionString: string) {
  const pool = new Pool({ connectionString });
  const db = drizzle({ client: pool, schema });
  return {
    db,
    pool,
    transaction: db.transaction.bind(db),
    migrate: () => migrate(db, { migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)) }),
    close: () => pool.end(),
  };
}

export type Database = ReturnType<typeof createDatabase>;
