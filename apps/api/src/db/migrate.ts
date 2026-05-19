import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { fileURLToPath } from "node:url";
import { db, type DbClient } from "./client";

export function resolveMigrationsFolder() {
  return fileURLToPath(new URL("../../drizzle", import.meta.url));
}

export async function runMigrations(
  database: DbClient = db,
  migrationsFolder = resolveMigrationsFolder(),
) {
  migrate(database, { migrationsFolder });

  return {
    migrationsFolder,
  };
}

const isDirectRun = (import.meta as ImportMeta & { main?: boolean }).main;

if (isDirectRun) {
  const { migrationsFolder } = await runMigrations();

  console.log(`Applied Drizzle migrations from ${migrationsFolder}`);
}
