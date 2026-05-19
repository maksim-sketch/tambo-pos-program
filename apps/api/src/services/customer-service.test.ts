import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { getCustomerProfile } from "./customer-service";

describe("getCustomerProfile", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns the best matching customer profile with cross-branch history", async () => {
    const profile = await getCustomerProfile(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      search: "ada",
    });

    expect(profile).toMatchObject({
      customerName: "Ada Lovelace",
      email: "ada@example.com",
      loyaltyPoints: 1280,
      totalSpendCents: 5208,
      branchesVisited: ["Branch B", "Branch A"],
    });
    expect(profile.recentPurchases).toEqual([
      expect.objectContaining({
        branchCode: "branch-b",
        branchName: "Branch B",
        itemName: "Blue Shirt",
        quantity: 1,
        totalCents: 3200,
      }),
      expect.objectContaining({
        branchCode: "branch-b",
        branchName: "Branch B",
        itemName: "Cold Brew",
        quantity: 1,
        totalCents: 650,
      }),
      expect.objectContaining({
        branchCode: "branch-a",
        branchName: "Branch A",
        itemName: "Espresso",
        quantity: 2,
        totalCents: 800,
      }),
    ]);
    expect(profile.lastSeenAt).toContain("T");
  });

  test("returns a safe empty profile when no customer matches", async () => {
    const profile = await getCustomerProfile(testDb.db, {
      tenantSlug: "demo-retail",
      search: "unknown customer",
    });

    expect(profile).toMatchObject({
      customerName: "Unknown Customer",
      loyaltyPoints: 0,
      totalSpendCents: 0,
      branchesVisited: [],
      recentPurchases: [],
    });
  });
});
