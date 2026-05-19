import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { getInventorySnapshot } from "./inventory-service";

describe("getInventorySnapshot", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns a cross-branch snapshot and prioritizes the requested branch first", async () => {
    const snapshot = await getInventorySnapshot(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      productQuery: "Blue Shirt",
    });

    expect(snapshot.productName).toBe("Blue Shirt");
    expect(snapshot.scopeLabel).toBe("All branches");
    expect(snapshot.branches).toEqual([
      expect.objectContaining({
        branchCode: "branch-b",
        branchName: "Branch B",
        quantity: 5,
        lowStock: true,
      }),
      expect.objectContaining({
        branchCode: "branch-a",
        branchName: "Branch A",
        quantity: 12,
        lowStock: false,
      }),
    ]);
    expect(snapshot.lastUpdatedAt).toContain("T");
  });
});
