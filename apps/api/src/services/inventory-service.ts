import { and, eq, like } from "drizzle-orm";
import type {
  InventoryStatusQuery,
  InventoryStatusResponse,
} from "../../../../packages/shared/src";
import { InventoryStatusResponseSchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { branches, inventoryLevels, products, tenants } from "../db/schema";

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

function sortBranchSnapshots(
  branchSnapshots: InventoryStatusResponse["branches"],
  preferredBranchCode?: string,
) {
  return [...branchSnapshots].sort((left, right) => {
    if (preferredBranchCode) {
      const leftPreferred = left.branchCode === preferredBranchCode ? 0 : 1;
      const rightPreferred = right.branchCode === preferredBranchCode ? 0 : 1;

      if (leftPreferred !== rightPreferred) {
        return leftPreferred - rightPreferred;
      }
    }

    return left.branchName.localeCompare(right.branchName);
  });
}

export async function getInventorySnapshot(
  database: DbClient = db,
  input: InventoryStatusQuery,
) {
  const rows = await database
    .select({
      productId: products.id,
      productName: products.name,
      branchId: branches.id,
      branchCode: branches.code,
      branchName: branches.name,
      quantity: inventoryLevels.quantity,
      updatedAt: inventoryLevels.updatedAt,
    })
    .from(inventoryLevels)
    .innerJoin(products, eq(products.id, inventoryLevels.productId))
    .innerJoin(branches, eq(branches.id, inventoryLevels.branchId))
    .innerJoin(tenants, eq(tenants.id, inventoryLevels.tenantId))
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        like(products.name, `%${input.productQuery.trim()}%`),
      ),
    );

  if (rows.length === 0) {
    return InventoryStatusResponseSchema.parse({
      productId: `inventory-query-${slugify(input.productQuery) || "unknown"}`,
      productName: input.productQuery,
      scopeLabel: "No matching inventory found",
      branches: [],
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  const bestProductName = [...new Set(rows.map((row) => row.productName))].sort(
    (left, right) => {
      const scoreDifference =
        scoreProductName(left, input.productQuery) -
        scoreProductName(right, input.productQuery);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return left.localeCompare(right);
    },
  )[0];

  const selectedRows = rows.filter((row) => row.productName === bestProductName);
  const latestUpdatedAt = [...selectedRows]
    .map((row) => row.updatedAt)
    .sort((left, right) => right.localeCompare(left))[0];
  const branchSnapshots = sortBranchSnapshots(
    selectedRows.map((row) => ({
      branchId: row.branchId,
      branchCode: row.branchCode,
      branchName: row.branchName,
      quantity: row.quantity,
      lowStock: row.quantity <= 5,
    })),
    input.branchCode,
  );

  return InventoryStatusResponseSchema.parse({
    productId: selectedRows[0]?.productId ?? `inventory-query-${slugify(input.productQuery)}`,
    productName: selectedRows[0]?.productName ?? input.productQuery,
    scopeLabel: "All branches",
    branches: branchSnapshots,
    lastUpdatedAt: latestUpdatedAt ?? new Date().toISOString(),
  });
}
