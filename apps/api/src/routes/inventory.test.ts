import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createInventoryRouter } from "./inventory";

describe("createInventoryRouter", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns inventory JSON for a valid status query", async () => {
    const router = createInventoryRouter(testDb.db);
    const response = await router.request(
      "http://localhost/status?tenantSlug=demo-retail&productQuery=Blue%20Shirt",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      productName: "Blue Shirt",
      scopeLabel: "All branches",
    });
    expect(body.branches).toHaveLength(2);
  });

  test("rejects invalid inventory queries", async () => {
    const router = createInventoryRouter(testDb.db);
    const response = await router.request(
      "http://localhost/status?tenantSlug=demo-retail",
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Invalid inventory query",
    });
  });
});
