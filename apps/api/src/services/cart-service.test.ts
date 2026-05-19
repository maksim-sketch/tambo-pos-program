import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { PrepareCartServiceError, prepareCart } from "./cart-service";

describe("prepareCart", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns a typed cart for a valid branch and product", async () => {
    const cart = await prepareCart(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-a",
      cartId: "cart-main",
      productName: "Espresso",
      quantity: 2,
    });

    expect(cart).toMatchObject({
      cartId: "cart-main",
      branchName: "Branch A",
      subtotalCents: 800,
      taxCents: 96,
      totalCents: 896,
      items: [
        expect.objectContaining({
          name: "Espresso",
          quantity: 2,
          unitPriceCents: 400,
        }),
      ],
    });
  });

  test("best-matches product names inside the tenant", async () => {
    const cart = await prepareCart(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      cartId: "cart-main",
      productName: "blue shirt",
      quantity: 1,
    });

    expect(cart.items[0]).toMatchObject({
      name: "Blue Shirt",
      quantity: 1,
      unitPriceCents: 3200,
    });
  });

  test("rejects unknown products", async () => {
    await expect(
      prepareCart(testDb.db, {
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        cartId: "cart-main",
        productName: "Unknown Drink",
        quantity: 1,
      }),
    ).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      statusCode: 404,
    } satisfies Partial<PrepareCartServiceError>);
  });
});
