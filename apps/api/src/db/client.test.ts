import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDatabaseUrl } from "./client";

const expectedDatabasePath = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "..",
  "..",
  "dev.db",
);

describe("resolveDatabaseUrl", () => {
  test("uses the api-local dev.db path when DATABASE_URL is unset", () => {
    const originalDatabaseUrl = Bun.env.DATABASE_URL;

    try {
      delete Bun.env.DATABASE_URL;
      expect(resolveDatabaseUrl()).toBe(expectedDatabasePath);
    } finally {
      if (originalDatabaseUrl === undefined) {
        delete Bun.env.DATABASE_URL;
      } else {
        Bun.env.DATABASE_URL = originalDatabaseUrl;
      }
    }
  });
});
