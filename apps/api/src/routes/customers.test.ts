import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createCustomerRouter } from "./customers";

describe("createCustomerRouter", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns customer profile JSON for a valid query", async () => {
    const router = createCustomerRouter(testDb.db);
    const response = await router.request(
      "http://localhost/profile?tenantSlug=demo-retail&search=Ada",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      customerName: "Ada Lovelace",
      loyaltyPoints: 1280,
    });
    expect(body.recentPurchases).toHaveLength(3);
  });

  test("rejects invalid customer queries", async () => {
    const router = createCustomerRouter(testDb.db);
    const response = await router.request(
      "http://localhost/profile?tenantSlug=demo-retail",
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Invalid customer profile query",
    });
  });
});
