import { calculateTotalCents } from "../../../../packages/shared/src";
import { db, type DbClient } from "./client";
import {
  branches,
  customers,
  inventoryEvents,
  inventoryLevels,
  products,
  saleItems,
  sales,
  tenants,
  posSessions
} from "./schema";

export const demoIds = {
  tenant: "tenant-demo-retail",
  branches: {
    branchA: "branch-demo-a",
    branchB: "branch-demo-b",
  },
  products: {
    blueShirt: "product-blue-shirt",
    espresso: "product-espresso",
    coldBrew: "product-cold-brew",
    signatureBeans: "product-signature-beans",
  },
  customers: {
    ada: "customer-ada",
    grace: "customer-grace",
    john: "customer-john",
  },
  sales: {
    adaBranchAMorning: "sale-ada-branch-a-morning",
    adaBranchBAfternoon: "sale-ada-branch-b-afternoon",
    johnBranchAEvening: "sale-john-branch-a-evening",
    graceBranchBNoon: "sale-grace-branch-b-noon",
  },
} as const;

function createDemoTimestamp(
  dayOffset: number,
  hour: number,
  minute = 0,
  second = 0,
) {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + dayOffset,
      hour,
      minute,
      second,
      0,
    ),
  );

  return utcDate.toISOString();
}

export function resetDatabase(database: DbClient = db) {
  database.transaction((tx) => {
    tx.delete(inventoryEvents).run();
    tx.delete(saleItems).run();
    tx.delete(sales).run();
    tx.delete(inventoryLevels).run();
    tx.delete(customers).run();
    tx.delete(products).run();
    tx.delete(branches).run();
    tx.delete(tenants).run();
    tx.delete(posSessions).run();
  });
}

export function seedDemoData(database: DbClient = db) {
  const timestamps = {
    tenantCreatedAt: createDemoTimestamp(-30, 9),
    branchCreatedAt: createDemoTimestamp(-25, 10),
    productCreatedAt: createDemoTimestamp(-20, 11),
    customerCreatedAt: createDemoTimestamp(-15, 12),
    customerSeenAt: createDemoTimestamp(0, 18, 30),
    inventoryUpdatedAt: createDemoTimestamp(0, 19),
    saleAdaBranchAMorning: createDemoTimestamp(0, 8, 15),
    saleGraceBranchBNoon: createDemoTimestamp(0, 12, 10),
    saleAdaBranchBAfternoon: createDemoTimestamp(0, 14, 20),
    saleJohnBranchAEvening: createDemoTimestamp(0, 18, 5),
  };

  const inventoryRows = [
    {
      id: "inventory-branch-a-blue-shirt",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      productId: demoIds.products.blueShirt,
      quantity: 12,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-b-blue-shirt",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      productId: demoIds.products.blueShirt,
      quantity: 5,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-a-espresso",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      productId: demoIds.products.espresso,
      quantity: 18,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-b-espresso",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      productId: demoIds.products.espresso,
      quantity: 8,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-a-cold-brew",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      productId: demoIds.products.coldBrew,
      quantity: 9,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-b-cold-brew",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      productId: demoIds.products.coldBrew,
      quantity: 11,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-a-signature-beans",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      productId: demoIds.products.signatureBeans,
      quantity: 12,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
    {
      id: "inventory-branch-b-signature-beans",
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      productId: demoIds.products.signatureBeans,
      quantity: 7,
      updatedAt: timestamps.inventoryUpdatedAt,
    },
  ];

  const saleRows = [
    {
      id: demoIds.sales.adaBranchAMorning,
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      customerId: demoIds.customers.ada,
      subtotalCents: 800,
      ...calculateTotalCents(800),
      createdAt: timestamps.saleAdaBranchAMorning,
    },
    {
      id: demoIds.sales.graceBranchBNoon,
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      customerId: demoIds.customers.grace,
      subtotalCents: 2100,
      ...calculateTotalCents(2100),
      createdAt: timestamps.saleGraceBranchBNoon,
    },
    {
      id: demoIds.sales.adaBranchBAfternoon,
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchB,
      customerId: demoIds.customers.ada,
      subtotalCents: 3850,
      ...calculateTotalCents(3850),
      createdAt: timestamps.saleAdaBranchBAfternoon,
    },
    {
      id: demoIds.sales.johnBranchAEvening,
      tenantId: demoIds.tenant,
      branchId: demoIds.branches.branchA,
      customerId: demoIds.customers.john,
      subtotalCents: 5400,
      ...calculateTotalCents(5400),
      createdAt: timestamps.saleJohnBranchAEvening,
    },
  ];

  database.transaction((tx) => {
    tx.delete(inventoryEvents).run();
    tx.delete(saleItems).run();
    tx.delete(sales).run();
    tx.delete(inventoryLevels).run();
    tx.delete(customers).run();
    tx.delete(products).run();
    tx.delete(branches).run();
    tx.delete(tenants).run();

    tx.insert(tenants)
      .values({
        id: demoIds.tenant,
        slug: "demo-retail",
        name: "Demo Retail",
        createdAt: timestamps.tenantCreatedAt,
      })
      .run();

    tx.insert(branches)
      .values([
        {
          id: demoIds.branches.branchA,
          tenantId: demoIds.tenant,
          code: "branch-a",
          name: "Branch A",
          createdAt: timestamps.branchCreatedAt,
        },
        {
          id: demoIds.branches.branchB,
          tenantId: demoIds.tenant,
          code: "branch-b",
          name: "Branch B",
          createdAt: timestamps.branchCreatedAt,
        },
      ])
      .run();

    tx.insert(products)
      .values([
        {
          id: demoIds.products.blueShirt,
          tenantId: demoIds.tenant,
          sku: "APP-BLUE-SHIRT",
          name: "Blue Shirt",
          priceCents: 3200,
          isActive: true,
          createdAt: timestamps.productCreatedAt,
        },
        {
          id: demoIds.products.espresso,
          tenantId: demoIds.tenant,
          sku: "DRK-ESPRESSO",
          name: "Espresso",
          priceCents: 400,
          isActive: true,
          createdAt: timestamps.productCreatedAt,
        },
        {
          id: demoIds.products.coldBrew,
          tenantId: demoIds.tenant,
          sku: "DRK-COLD-BREW",
          name: "Cold Brew",
          priceCents: 650,
          isActive: true,
          createdAt: timestamps.productCreatedAt,
        },
        {
          id: demoIds.products.signatureBeans,
          tenantId: demoIds.tenant,
          sku: "BNS-SIGNATURE",
          name: "Signature Blend Beans",
          priceCents: 1800,
          isActive: true,
          createdAt: timestamps.productCreatedAt,
        },
      ])
      .run();

    tx.insert(customers)
      .values([
        {
          id: demoIds.customers.ada,
          tenantId: demoIds.tenant,
          fullName: "Ada Lovelace",
          email: "ada@example.com",
          loyaltyPoints: 1280,
          createdAt: timestamps.customerCreatedAt,
          lastSeenAt: timestamps.customerSeenAt,
        },
        {
          id: demoIds.customers.grace,
          tenantId: demoIds.tenant,
          fullName: "Grace Hopper",
          email: "grace@example.com",
          loyaltyPoints: 920,
          createdAt: timestamps.customerCreatedAt,
          lastSeenAt: timestamps.customerSeenAt,
        },
        {
          id: demoIds.customers.john,
          tenantId: demoIds.tenant,
          fullName: "John Smith",
          email: "john@example.com",
          loyaltyPoints: 410,
          createdAt: timestamps.customerCreatedAt,
          lastSeenAt: timestamps.customerSeenAt,
        },
      ])
      .run();

    tx.insert(inventoryLevels).values(inventoryRows).run();
    tx.insert(sales).values(saleRows).run();

    tx.insert(saleItems)
      .values([
        {
          id: "sale-item-ada-a-espresso",
          saleId: demoIds.sales.adaBranchAMorning,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchA,
          productId: demoIds.products.espresso,
          quantity: 2,
          unitPriceCents: 400,
          lineTotalCents: 800,
          createdAt: timestamps.saleAdaBranchAMorning,
        },
        {
          id: "sale-item-grace-b-espresso",
          saleId: demoIds.sales.graceBranchBNoon,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.espresso,
          quantity: 2,
          unitPriceCents: 400,
          lineTotalCents: 800,
          createdAt: timestamps.saleGraceBranchBNoon,
        },
        {
          id: "sale-item-grace-b-cold-brew",
          saleId: demoIds.sales.graceBranchBNoon,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.coldBrew,
          quantity: 2,
          unitPriceCents: 650,
          lineTotalCents: 1300,
          createdAt: timestamps.saleGraceBranchBNoon,
        },
        {
          id: "sale-item-ada-b-blue-shirt",
          saleId: demoIds.sales.adaBranchBAfternoon,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.blueShirt,
          quantity: 1,
          unitPriceCents: 3200,
          lineTotalCents: 3200,
          createdAt: timestamps.saleAdaBranchBAfternoon,
        },
        {
          id: "sale-item-ada-b-cold-brew",
          saleId: demoIds.sales.adaBranchBAfternoon,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.coldBrew,
          quantity: 1,
          unitPriceCents: 650,
          lineTotalCents: 650,
          createdAt: timestamps.saleAdaBranchBAfternoon,
        },
        {
          id: "sale-item-john-a-signature-beans",
          saleId: demoIds.sales.johnBranchAEvening,
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchA,
          productId: demoIds.products.signatureBeans,
          quantity: 3,
          unitPriceCents: 1800,
          lineTotalCents: 5400,
          createdAt: timestamps.saleJohnBranchAEvening,
        },
      ])
      .run();

    tx.insert(inventoryEvents)
      .values([
        {
          id: "inventory-event-a-espresso-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchA,
          productId: demoIds.products.espresso,
          saleId: demoIds.sales.adaBranchAMorning,
          quantityBefore: 20,
          quantityAfter: 18,
          quantityDelta: -2,
          reason: "checkout",
          createdAt: timestamps.saleAdaBranchAMorning,
        },
        {
          id: "inventory-event-b-espresso-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.espresso,
          saleId: demoIds.sales.graceBranchBNoon,
          quantityBefore: 10,
          quantityAfter: 8,
          quantityDelta: -2,
          reason: "checkout",
          createdAt: timestamps.saleGraceBranchBNoon,
        },
        {
          id: "inventory-event-b-cold-brew-grace-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.coldBrew,
          saleId: demoIds.sales.graceBranchBNoon,
          quantityBefore: 14,
          quantityAfter: 12,
          quantityDelta: -2,
          reason: "checkout",
          createdAt: timestamps.saleGraceBranchBNoon,
        },
        {
          id: "inventory-event-b-blue-shirt-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.blueShirt,
          saleId: demoIds.sales.adaBranchBAfternoon,
          quantityBefore: 6,
          quantityAfter: 5,
          quantityDelta: -1,
          reason: "checkout",
          createdAt: timestamps.saleAdaBranchBAfternoon,
        },
        {
          id: "inventory-event-b-cold-brew-ada-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchB,
          productId: demoIds.products.coldBrew,
          saleId: demoIds.sales.adaBranchBAfternoon,
          quantityBefore: 12,
          quantityAfter: 11,
          quantityDelta: -1,
          reason: "checkout",
          createdAt: timestamps.saleAdaBranchBAfternoon,
        },
        {
          id: "inventory-event-a-signature-beans-sale",
          tenantId: demoIds.tenant,
          branchId: demoIds.branches.branchA,
          productId: demoIds.products.signatureBeans,
          saleId: demoIds.sales.johnBranchAEvening,
          quantityBefore: 15,
          quantityAfter: 12,
          quantityDelta: -3,
          reason: "checkout",
          createdAt: timestamps.saleJohnBranchAEvening,
        },
      ])
      .run();
  });

  return {
    tenantSlug: "demo-retail",
    branchCodes: ["branch-a", "branch-b"],
    productCount: 4,
    customerCount: 3,
    inventoryRowCount: inventoryRows.length,
    saleCount: saleRows.length,
  };
}

const isDirectRun = (import.meta as ImportMeta & { main?: boolean }).main;

if (isDirectRun) {
  const summary = seedDemoData();

  console.log(
    `Seeded ${summary.tenantSlug} with ${summary.branchCodes.length} branches, ${summary.productCount} products, ${summary.customerCount} customers, ${summary.inventoryRowCount} inventory rows, and ${summary.saleCount} sales.`,
  );
}
