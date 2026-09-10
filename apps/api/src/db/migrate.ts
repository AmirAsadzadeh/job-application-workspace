import { loadConfig } from "../config.js";
import { createDatabase } from "./connection.js";

const database = createDatabase(loadConfig().DATABASE_URL);
try {
  await database.migrate();
} finally {
  await database.close();
}
