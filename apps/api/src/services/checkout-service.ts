import { and, eq, like } from "drizzle-orm";
import {
  calculateTotalCents,
  CheckoutSaleResponseSchema,
  type CheckoutSaleRequest,
} from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import {
  branches,
  customers,
  inventoryEvents,
  inventoryLevels,
  products,
  saleItems,
  sales,
  tenants,
} from "../db/schema";

type TransactionDb = Parameters<DbClient["transaction"]>[0] extends (
  tx: infer T,
) => unknown
  ? T
  : never;
type CheckoutDatabase = DbClient | TransactionDb;

export class CheckoutServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "CheckoutServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function scoreProductName(productName: string, productQuery: string) {
  const normalizedName = normalizeSearch(productName);
  const normalizedQuery = normalizeSearch(productQuery);

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

function createId() {
  return crypto.randomUUID();
}

interface ResolvedBranch {
  tenantId: string;
  branchId: string;
  branchCode: string;
  branchName: string;
}

interface ResolvedCustomer {
  customerId: string;
}

interface ResolvedProduct {
  productId: string;
  productName: string;
  unitPriceCents: number;
}

interface AggregatedCheckoutItem extends ResolvedProduct {
  quantity: number;
}

interface InventorySnapshot {
  inventoryLevelId: string | null;
  quantityBefore: number;
}

function resolveBranch(
  database: CheckoutDatabase,
  tenantSlug: string,
  branchCode: string,
): ResolvedBranch {
  const branch = database
    .select({
      tenantId: tenants.id,
      branchId: branches.id,
      branchCode: branches.code,
      branchName: branches.name,
    })
    .from(branches)
    .innerJoin(tenants, eq(tenants.id, branches.tenantId))
    .where(and(eq(tenants.slug, tenantSlug), eq(branches.code, branchCode)))
    .get();

  if (!branch) {
    throw new CheckoutServiceError(
      `Branch ${branchCode} was not found in tenant ${tenantSlug}.`,
      "BRANCH_NOT_FOUND",
      404,
    );
  }

  return branch;
}

function resolveCustomer(
  database: CheckoutDatabase,
  tenantId: string,
  customerId?: string,
): ResolvedCustomer | null {
  if (!customerId) {
    return null;
  }

  const customer = database
    .select({
      customerId: customers.id,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .get();

  if (!customer) {
    throw new CheckoutServiceError(
      `Customer ${customerId} was not found in this tenant.`,
      "CUSTOMER_NOT_FOUND",
      404,
    );
  }

  return customer;
}

function resolveProduct(
  database: CheckoutDatabase,
  tenantId: string,
  item: CheckoutSaleRequest["items"][number],
): ResolvedProduct {
  if (item.productId) {
    const product = database
      .select({
        productId: products.id,
        productName: products.name,
        unitPriceCents: products.priceCents,
      })
      .from(products)
      .where(
        and(
          eq(products.id, item.productId),
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
        ),
      )
      .get();

    if (!product) {
      throw new CheckoutServiceError(
        `Product ${item.productId} was not found in this tenant.`,
        "PRODUCT_NOT_FOUND",
        404,
      );
    }

    return product;
  }

  const matches = database
    .select({
      productId: products.id,
      productName: products.name,
      unitPriceCents: products.priceCents,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenantId),
        eq(products.isActive, true),
        like(products.name, `%${item.productName.trim()}%`),
      ),
    )
    .all();

  if (matches.length === 0) {
    throw new CheckoutServiceError(
      `No product matched ${item.productName} in this tenant.`,
      "PRODUCT_NOT_FOUND",
      404,
    );
  }

  return [...matches].sort((left, right) => {
    const scoreDifference =
      scoreProductName(left.productName, item.productName) -
      scoreProductName(right.productName, item.productName);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.productName.localeCompare(right.productName);
  })[0]!;
}

function readInventorySnapshot(
  database: CheckoutDatabase,
  tenantId: string,
  branchId: string,
  productId: string,
): InventorySnapshot {
  const inventoryRow = database
    .select({
      inventoryLevelId: inventoryLevels.id,
      quantityBefore: inventoryLevels.quantity,
    })
    .from(inventoryLevels)
    .where(
      and(
        eq(inventoryLevels.tenantId, tenantId),
        eq(inventoryLevels.branchId, branchId),
        eq(inventoryLevels.productId, productId),
      ),
    )
    .get();

  return {
    inventoryLevelId: inventoryRow?.inventoryLevelId ?? null,
    quantityBefore: inventoryRow?.quantityBefore ?? 0,
  };
}

function aggregateItems(
  database: CheckoutDatabase,
  tenantId: string,
  items: CheckoutSaleRequest["items"],
) {
  const aggregatedItems = new Map<string, AggregatedCheckoutItem>();

  for (const item of items) {
    const resolvedProduct = resolveProduct(database, tenantId, item);
    const existing = aggregatedItems.get(resolvedProduct.productId);

    if (existing) {
      existing.quantity += item.quantity;
      continue;
    }

    aggregatedItems.set(resolvedProduct.productId, {
      ...resolvedProduct,
      quantity: item.quantity,
    });
  }

  return [...aggregatedItems.values()];
}

export async function checkoutSale(
  database: DbClient = db,
  input: CheckoutSaleRequest,
) {
  const createdAt = new Date().toISOString();

  // Checkout must stay atomic: sale rows, stock decrements, and inventory
  // events are written in one transaction so branch stock cannot drift.
  const receipt = database.transaction((tx) => {
    const branch = resolveBranch(tx, input.tenantSlug, input.branchCode);
    const customer = resolveCustomer(tx, branch.tenantId, input.customerId);
    const aggregatedItems = aggregateItems(tx, branch.tenantId, input.items);
    const saleId = createId();

    const lineItems = aggregatedItems.map((item) => {
      const inventorySnapshot = readInventorySnapshot(
        tx,
        branch.tenantId,
        branch.branchId,
        item.productId,
      );

      if (inventorySnapshot.quantityBefore < item.quantity) {
        throw new CheckoutServiceError(
          `Insufficient stock for ${item.productName} in ${branch.branchCode}.`,
          "INSUFFICIENT_STOCK",
          409,
        );
      }

      return {
        ...item,
        lineTotalCents: item.unitPriceCents * item.quantity,
        inventoryLevelId: inventorySnapshot.inventoryLevelId,
        quantityBefore: inventorySnapshot.quantityBefore,
        quantityAfter: inventorySnapshot.quantityBefore - item.quantity,
      };
    });

    const subtotalCents = lineItems.reduce(
      (runningTotal, item) => runningTotal + item.lineTotalCents,
      0,
    );
    const { taxCents, totalCents } = calculateTotalCents(subtotalCents);

    tx.insert(sales)
      .values({
        id: saleId,
        tenantId: branch.tenantId,
        branchId: branch.branchId,
        customerId: customer?.customerId ?? null,
        subtotalCents,
        taxCents,
        totalCents,
        createdAt,
      })
      .run();

    tx.insert(saleItems)
      .values(
        lineItems.map((item) => ({
          id: createId(),
          saleId,
          tenantId: branch.tenantId,
          branchId: branch.branchId,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          lineTotalCents: item.lineTotalCents,
          createdAt,
        })),
      )
      .run();

    for (const item of lineItems) {
      if (!item.inventoryLevelId) {
        throw new CheckoutServiceError(
          `Inventory row for ${item.productName} in ${branch.branchCode} was not found.`,
          "INVENTORY_NOT_FOUND",
          404,
        );
      }

      tx.update(inventoryLevels)
        .set({
          quantity: item.quantityAfter,
          updatedAt: createdAt,
        })
        .where(eq(inventoryLevels.id, item.inventoryLevelId))
        .run();

      tx.insert(inventoryEvents)
        .values({
          id: createId(),
          tenantId: branch.tenantId,
          branchId: branch.branchId,
          productId: item.productId,
          saleId,
          quantityBefore: item.quantityBefore,
          quantityAfter: item.quantityAfter,
          quantityDelta: -item.quantity,
          reason: "checkout",
          createdAt,
        })
        .run();
    }

    if (customer?.customerId) {
      tx.update(customers)
        .set({
          lastSeenAt: createdAt,
        })
        .where(eq(customers.id, customer.customerId))
        .run();
    }

    return CheckoutSaleResponseSchema.parse({
      saleId,
      tenantSlug: input.tenantSlug,
      branchId: branch.branchId,
      branchCode: branch.branchCode,
      branchName: branch.branchName,
      customerId: customer?.customerId ?? null,
      subtotalCents,
      taxCents,
      totalCents,
      items: lineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
      inventoryDeltas: lineItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantityBefore: item.quantityBefore,
        quantityAfter: item.quantityAfter,
        quantityDelta: -item.quantity,
      })),
      createdAt,
    });
  });

  return receipt;
}
