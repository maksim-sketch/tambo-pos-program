import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "./db/seed";
import { createTestDb, type TestDbHandle } from "./test/test-db";
import { createApp } from "./app";

describe("createApp", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("mounts the inventory route under /api/inventory", async () => {
    const app = createApp(testDb.db);
    const response = await app.request(
      "/api/inventory/status?tenantSlug=demo-retail&productQuery=Blue%20Shirt",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      productName: "Blue Shirt",
      scopeLabel: "All branches",
    });
  });

  test("mounts the cart prepare route under /api/cart", async () => {
    const app = createApp(testDb.db);
    const response = await app.request("/api/cart/prepare", {
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

  test("mounts the customer profile route under /api/customers", async () => {
    const app = createApp(testDb.db);
    const response = await app.request(
      "/api/customers/profile?tenantSlug=demo-retail&search=Ada",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      customerName: "Ada Lovelace",
      loyaltyPoints: 1280,
    });
  });

  test("mounts the sales report route under /api/reports", async () => {
    const app = createApp(testDb.db);
    const response = await app.request(
      "/api/reports/sales?tenantSlug=demo-retail&range=today",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      range: "today",
      rangeLabel: "Today's Sales",
    });
  });

  test("mounts the checkout route under /api/checkout", async () => {
    const app = createApp(testDb.db);
    const response = await app.request("/api/checkout", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        items: [
          {
            productName: "Espresso",
            quantity: 1,
          },
        ],
      }),
    });

    expect(response.status).toBe(201);

    const body = await response.json();

    expect(body).toMatchObject({
      branchCode: "branch-a",
      taxCents: 48,
      totalCents: 448,
    });
  });

  test("adds CORS headers for the local Vite frontend", async () => {
    const app = createApp(testDb.db);
    const response = await app.request(
      "/api/inventory/status?tenantSlug=demo-retail&productQuery=Blue%20Shirt",
      {
        method: "OPTIONS",
        headers: {
          Origin: "http://localhost:5173",
          "Access-Control-Request-Method": "GET",
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:5173",
    );
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "GET",
    );
  });
});
