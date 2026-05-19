import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { seedDemoData } from "../db/seed";
import {
  customers,
  inventoryEvents,
  inventoryLevels,
  products,
  sales,
} from "../db/schema";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { CheckoutServiceError, checkoutSale } from "./checkout-service";

describe("checkoutSale", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("decrements branch inventory and returns a receipt payload", async () => {
    const receipt = await checkoutSale(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-a",
      customerId: "customer-ada",
      items: [
        {
          productName: "Espresso",
          quantity: 2,
        },
      ],
    });

    expect(receipt).toMatchObject({
      tenantSlug: "demo-retail",
      branchCode: "branch-a",
      branchName: "Branch A",
      customerId: "customer-ada",
      subtotalCents: 800,
      taxCents: 96,
      totalCents: 896,
      items: [
        expect.objectContaining({
          productName: "Espresso",
          quantity: 2,
          unitPriceCents: 400,
          lineTotalCents: 800,
        }),
      ],
      inventoryDeltas: [
        expect.objectContaining({
          productName: "Espresso",
          quantityBefore: 18,
          quantityAfter: 16,
          quantityDelta: -2,
        }),
      ],
    });
    expect(receipt.createdAt).toContain("T");

    const espressoInventory = await testDb.db
      .select({
        quantity: inventoryLevels.quantity,
      })
      .from(inventoryLevels)
      .innerJoin(products, eq(products.id, inventoryLevels.productId))
      .where(
        and(
          eq(inventoryLevels.branchId, "branch-demo-a"),
          eq(products.name, "Espresso"),
        ),
      );

    expect(espressoInventory[0]?.quantity).toBe(16);

    const createdSale = await testDb.db
      .select({
        id: sales.id,
        totalCents: sales.totalCents,
        customerId: sales.customerId,
      })
      .from(sales)
      .where(eq(sales.id, receipt.saleId));

    expect(createdSale[0]).toMatchObject({
      id: receipt.saleId,
      totalCents: 896,
      customerId: "customer-ada",
    });

    const checkoutEvents = await testDb.db
      .select({
        saleId: inventoryEvents.saleId,
        productId: inventoryEvents.productId,
        quantityDelta: inventoryEvents.quantityDelta,
        reason: inventoryEvents.reason,
      })
      .from(inventoryEvents)
      .where(eq(inventoryEvents.saleId, receipt.saleId));

    expect(checkoutEvents).toEqual([
      expect.objectContaining({
        saleId: receipt.saleId,
        quantityDelta: -2,
        reason: "checkout",
      }),
    ]);

    const updatedCustomer = await testDb.db
      .select({
        lastSeenAt: customers.lastSeenAt,
      })
      .from(customers)
      .where(eq(customers.id, "customer-ada"));

    expect(updatedCustomer[0]?.lastSeenAt).toBe(receipt.createdAt);
  });

  test("aggregates duplicate line items before applying stock changes", async () => {
    const receipt = await checkoutSale(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-a",
      items: [
        {
          productName: "Espresso",
          quantity: 1,
        },
        {
          productName: "Espresso",
          quantity: 2,
        },
      ],
    });

    expect(receipt.items).toEqual([
      expect.objectContaining({
        productName: "Espresso",
        quantity: 3,
        lineTotalCents: 1200,
      }),
    ]);
    expect(receipt.inventoryDeltas).toEqual([
      expect.objectContaining({
        productName: "Espresso",
        quantityBefore: 18,
        quantityAfter: 15,
        quantityDelta: -3,
      }),
    ]);
  });

  test("rejects checkout when branch inventory is insufficient", async () => {
    await expect(
      checkoutSale(testDb.db, {
        tenantSlug: "demo-retail",
        branchCode: "branch-b",
        items: [
          {
            productName: "Blue Shirt",
            quantity: 6,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
      statusCode: 409,
    });
  });

  test("rejects unknown products without mutating inventory", async () => {
    await expect(
      checkoutSale(testDb.db, {
        tenantSlug: "demo-retail",
        branchCode: "branch-a",
        items: [
          {
            productName: "Unknown Drink",
            quantity: 1,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "PRODUCT_NOT_FOUND",
      statusCode: 404,
    });

    const inventorySnapshot = await testDb.db
      .select({
        quantity: inventoryLevels.quantity,
      })
      .from(inventoryLevels)
      .where(eq(inventoryLevels.id, "inventory-branch-a-espresso"));

    expect(inventorySnapshot[0]?.quantity).toBe(18);
  });
});
