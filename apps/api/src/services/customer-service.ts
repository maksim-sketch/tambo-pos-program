import { and, eq, like } from "drizzle-orm";
import type {
  CustomerProfileQuery,
  CustomerProfileResponse,
} from "../../../../packages/shared/src";
import { CustomerProfileResponseSchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import {
  branches,
  customers,
  products,
  saleItems,
  sales,
  tenants,
} from "../db/schema";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDisplayName(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function scoreCustomerName(customerName: string, search: string) {
  const normalizedName = normalizeSearch(customerName);
  const normalizedSearch = normalizeSearch(search);

  if (normalizedName === normalizedSearch) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedSearch)) {
    return 1;
  }

  return 2;
}

function sortBranchesVisited(
  branchNames: string[],
  preferredBranchCode?: string,
  branchNameByCode: Map<string, string> = new Map(),
) {
  return [...branchNames].sort((left, right) => {
    if (preferredBranchCode) {
      const preferredBranchName = branchNameByCode.get(preferredBranchCode);
      const leftPreferred = left === preferredBranchName ? 0 : 1;
      const rightPreferred = right === preferredBranchName ? 0 : 1;

      if (leftPreferred !== rightPreferred) {
        return leftPreferred - rightPreferred;
      }
    }

    return left.localeCompare(right);
  });
}

function sortRecentPurchases(
  purchases: CustomerProfileResponse["recentPurchases"],
  preferredBranchCode?: string,
) {
  return [...purchases].sort((left, right) => {
    const timeDifference = right.purchasedAt.localeCompare(left.purchasedAt);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    if (preferredBranchCode) {
      const leftPreferred = left.branchCode === preferredBranchCode ? 0 : 1;
      const rightPreferred = right.branchCode === preferredBranchCode ? 0 : 1;

      if (leftPreferred !== rightPreferred) {
        return leftPreferred - rightPreferred;
      }
    }

    const centsDifference = right.totalCents - left.totalCents;

    if (centsDifference !== 0) {
      return centsDifference;
    }

    return left.itemName.localeCompare(right.itemName);
  });
}

export async function getCustomerProfile(
  database: DbClient = db,
  input: CustomerProfileQuery,
) {
  const customerMatches = await database
    .select({
      customerId: customers.id,
      customerName: customers.fullName,
      email: customers.email,
      loyaltyPoints: customers.loyaltyPoints,
      lastSeenAt: customers.lastSeenAt,
    })
    .from(customers)
    .innerJoin(tenants, eq(tenants.id, customers.tenantId))
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        like(customers.fullName, `%${input.search.trim()}%`),
      ),
    );

  if (customerMatches.length === 0) {
    return CustomerProfileResponseSchema.parse({
      customerId: `customer-query-${slugify(input.search) || "unknown"}`,
      customerName: toDisplayName(input.search.trim() || "Unknown Customer"),
      email: null,
      loyaltyPoints: 0,
      totalSpendCents: 0,
      branchesVisited: [],
      recentPurchases: [],
    });
  }

  const bestMatch = [...customerMatches].sort((left, right) => {
    const scoreDifference =
      scoreCustomerName(left.customerName, input.search) -
      scoreCustomerName(right.customerName, input.search);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.customerName.localeCompare(right.customerName);
  })[0];

  const saleRows = await database
    .select({
      saleId: sales.id,
      branchCode: branches.code,
      branchName: branches.name,
      totalCents: sales.totalCents,
      createdAt: sales.createdAt,
    })
    .from(sales)
    .innerJoin(branches, eq(branches.id, sales.branchId))
    .where(eq(sales.customerId, bestMatch.customerId));

  const purchaseRows = await database
    .select({
      saleId: sales.id,
      branchCode: branches.code,
      branchName: branches.name,
      itemName: products.name,
      quantity: saleItems.quantity,
      totalCents: saleItems.lineTotalCents,
      purchasedAt: sales.createdAt,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .innerJoin(branches, eq(branches.id, saleItems.branchId))
    .innerJoin(products, eq(products.id, saleItems.productId))
    .where(eq(sales.customerId, bestMatch.customerId));

  const branchNameByCode = new Map(
    saleRows.map((row) => [row.branchCode, row.branchName]),
  );
  const branchesVisited = sortBranchesVisited(
    [...new Set(saleRows.map((row) => row.branchName))],
    input.branchCode,
    branchNameByCode,
  );
  const totalSpendCents = saleRows.reduce(
    (runningTotal, row) => runningTotal + row.totalCents,
    0,
  );
  const recentPurchases = sortRecentPurchases(
    purchaseRows.map((row) => ({
      saleId: row.saleId,
      branchCode: row.branchCode,
      branchName: row.branchName,
      itemName: row.itemName,
      quantity: row.quantity,
      totalCents: row.totalCents,
      purchasedAt: row.purchasedAt,
    })),
    input.branchCode,
  );

  return CustomerProfileResponseSchema.parse({
    customerId: bestMatch.customerId,
    customerName: bestMatch.customerName,
    email: bestMatch.email,
    loyaltyPoints: bestMatch.loyaltyPoints,
    totalSpendCents,
    branchesVisited,
    recentPurchases,
    lastSeenAt: bestMatch.lastSeenAt ?? undefined,
  });
}
