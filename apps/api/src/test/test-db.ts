import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDbClient, type DbClient } from "../db/client";
import { resolveMigrationsFolder, runMigrations } from "../db/migrate";

export interface TestDbHandle {
  db: DbClient;
  dispose: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDbHandle> {
  const tempDirectory = mkdtempSync(join(tmpdir(), "tambo-pos-test-db-"));
  const databasePath = join(tempDirectory, "test.db");
  const db = createDbClient(databasePath);

  await runMigrations(db, resolveMigrationsFolder());

  return {
    db,
    async dispose() {
      (db as { $client: Database }).$client.close();
      await Bun.sleep(25);

      try {
        rmSync(tempDirectory, { recursive: true, force: true });
      } catch {
        // Windows can briefly hold SQLite temp handles after close().
      }
    },
  };
}
