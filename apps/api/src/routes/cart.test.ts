import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createCartRouter } from "./cart";

describe("createCartRouter", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns cart JSON for a valid prepare payload", async () => {
    const router = createCartRouter(testDb.db);
    const response = await router.request("http://localhost/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        cartId: "cart-main",
        productName: "Espresso",
        quantity: 2,
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      branchName: "Branch A",
      totalCents: 896,
    });
  });

  test("rejects invalid cart payloads", async () => {
    const router = createCartRouter(testDb.db);
    const response = await router.request("http://localhost/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        branchCode: "branch-a",
        quantity: 2,
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Invalid cart payload",
    });
  });
});
