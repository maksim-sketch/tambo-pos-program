import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDbClient } from "./client";
import { resolveMigrationsFolder, runMigrations } from "./migrate";

describe("runMigrations", () => {
  let tempDirectory: string;
  let tempDatabasePath: string;

  beforeEach(() => {
    tempDirectory = mkdtempSync(join(tmpdir(), "tambo-pos-migrate-"));
    tempDatabasePath = join(tempDirectory, "test.db");
  });

  afterEach(async () => {
    await Bun.sleep(25);

    try {
      rmSync(tempDirectory, { recursive: true, force: true });
    } catch {
      // Windows may briefly keep SQLite temp handles open after close().
    }
  });

  test("applies the generated drizzle migrations to a fresh sqlite database", async () => {
    const db = createDbClient(tempDatabasePath);
    let sqlite: Database | null = null;

    try {
      await runMigrations(db, resolveMigrationsFolder());

      sqlite = new Database(tempDatabasePath);
      const tables = sqlite
        .query(
          "select name from sqlite_master where type = 'table' order by name",
        )
        .all() as Array<{ name: string }>;

      expect(tables.map((table) => table.name)).toContain("tenants");
      expect(tables.map((table) => table.name)).toContain("inventory_events");
    } finally {
      sqlite?.close();
      (db as { $client: Database }).$client.close();
    }
  });
});
