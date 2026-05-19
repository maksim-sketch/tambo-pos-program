import { drizzle } from "drizzle-orm/bun-sqlite";
import { fileURLToPath } from "node:url";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = fileURLToPath(
  new URL("../../dev.db", import.meta.url),
);

function readEnv(name: string): string | undefined {
  const maybeBun = globalThis as typeof globalThis & {
    Bun?: {
      env?: Record<string, string | undefined>;
    };
  };
  const maybeProcess = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>;
    };
  };

  return maybeBun.Bun?.env?.[name] ?? maybeProcess.process?.env?.[name];
}

export function resolveDatabaseUrl() {
  const configuredUrl = readEnv("DATABASE_URL")?.trim();
  return configuredUrl && configuredUrl.length > 0
    ? configuredUrl
    : DEFAULT_DATABASE_URL;
}

export function createDbClient(databaseUrl = resolveDatabaseUrl()) {
  return drizzle({
    connection: {
      source: databaseUrl,
      create: true,
    },
    schema,
  });
}

export const db = createDbClient();

export type DbClient = ReturnType<typeof createDbClient>;
