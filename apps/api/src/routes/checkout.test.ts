import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createCheckoutRouter } from "./checkout";

describe("createCheckoutRouter", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns 201 and a receipt payload for a valid checkout", async () => {
    const router = createCheckoutRouter(testDb.db);
    const response = await router.request("http://localhost/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        customerId: "customer-ada",
        items: [
          {
            productName: "Espresso",
            quantity: 2,
          },
        ],
      }),
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      tenantSlug: "demo-retail",
      branchCode: "branch-a",
      taxCents: 96,
      totalCents: 896,
    });
  });

  test("returns 400 for invalid checkout payloads", async () => {
    const router = createCheckoutRouter(testDb.db);
    const response = await router.request("http://localhost/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        items: [],
      }),
    });

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Invalid checkout payload",
    });
  });

  test("returns 409 when stock is insufficient", async () => {
    const router = createCheckoutRouter(testDb.db);
    const response = await router.request("http://localhost/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "demo-retail",
        branchCode: "branch-b",
        items: [
          {
            productName: "Blue Shirt",
            quantity: 6,
          },
        ],
      }),
    });

    expect(response.status).toBe(409);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Insufficient stock for Blue Shirt in branch-b.",
      code: "INSUFFICIENT_STOCK",
    });
  });
});
