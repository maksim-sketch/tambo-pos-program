import { and, eq, gte } from "drizzle-orm";
import type {
  SalesReportPoint,
  SalesReportQuery,
  SalesReportResponse,
} from "../../../../packages/shared/src";
import { SalesReportResponseSchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { branches, customers, products, saleItems, sales, tenants } from "../db/schema";

function getRangeLabel(range: SalesReportQuery["range"]) {
  switch (range) {
    case "today":
      return "Today's Sales";
    case "week":
      return "This Week";
    case "month":
      return "This Month";
    case "year":
      return "This Year";
    default:
      return "Sales Report";
  }
}

function getRangeStart(range: SalesReportQuery["range"]) {
  const now = new Date();

  switch (range) {
    case "today":
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
    case "week":
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - 6,
          0,
          0,
          0,
          0,
        ),
      );
    case "month":
      return new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
      );
    case "year":
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0, 0));
    default:
      return new Date(0);
  }
}

function getSeriesLabel(range: SalesReportQuery["range"], isoDateTime: string) {
  const date = new Date(isoDateTime);

  if (range === "today") {
    return `${String(date.getUTCHours()).padStart(2, "0")}:00`;
  }

  return date.toISOString().slice(0, 10);
}

function sortSeries(points: SalesReportPoint[]) {
  return [...points].sort((left, right) => left.hour.localeCompare(right.hour));
}

function sortByRevenueDescending<
  T extends { revenueCents?: number; totalSpendCents?: number; quantity?: number; productName?: string; fullName?: string },
>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftValue = left.revenueCents ?? left.totalSpendCents ?? 0;
    const rightValue = right.revenueCents ?? right.totalSpendCents ?? 0;
    const revenueDifference = rightValue - leftValue;

    if (revenueDifference !== 0) {
      return revenueDifference;
    }

    const leftQuantity = left.quantity ?? 0;
    const rightQuantity = right.quantity ?? 0;
    const quantityDifference = rightQuantity - leftQuantity;

    if (quantityDifference !== 0) {
      return quantityDifference;
    }

    return (left.productName ?? left.fullName ?? "").localeCompare(
      right.productName ?? right.fullName ?? "",
    );
  });
}

export async function getSalesReport(
  database: DbClient = db,
  input: SalesReportQuery,
) {
  const rangeStart = getRangeStart(input.range).toISOString();

  const saleRows = await database
    .select({
      saleId: sales.id,
      branchCode: branches.code,
      totalCents: sales.totalCents,
      createdAt: sales.createdAt,
      customerId: customers.id,
      customerName: customers.fullName,
    })
    .from(sales)
    .innerJoin(tenants, eq(tenants.id, sales.tenantId))
    .innerJoin(branches, eq(branches.id, sales.branchId))
    .leftJoin(customers, eq(customers.id, sales.customerId))
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        gte(sales.createdAt, rangeStart),
        input.branchCode ? eq(branches.code, input.branchCode) : undefined,
      ),
    );

  const saleItemRows = await database
    .select({
      branchCode: branches.code,
      productId: products.id,
      productName: products.name,
      quantity: saleItems.quantity,
      revenueCents: saleItems.lineTotalCents,
      createdAt: sales.createdAt,
    })
    .from(saleItems)
    .innerJoin(sales, eq(sales.id, saleItems.saleId))
    .innerJoin(tenants, eq(tenants.id, sales.tenantId))
    .innerJoin(branches, eq(branches.id, saleItems.branchId))
    .innerJoin(products, eq(products.id, saleItems.productId))
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        gte(sales.createdAt, rangeStart),
        input.branchCode ? eq(branches.code, input.branchCode) : undefined,
      ),
    );

  if (saleRows.length === 0) {
    return SalesReportResponseSchema.parse({
      range: input.range,
      rangeLabel: getRangeLabel(input.range),
      branchCode: input.branchCode,
      revenueCents: 0,
      series: [],
      topItems: [],
      highValueCustomers: [],
      generatedAt: new Date().toISOString(),
    });
  }

  const revenueCents = saleRows.reduce(
    (runningTotal, row) => runningTotal + row.totalCents,
    0,
  );

  const seriesByLabel = new Map<string, number>();

  for (const row of saleRows) {
    const label = getSeriesLabel(input.range, row.createdAt);
    seriesByLabel.set(label, (seriesByLabel.get(label) ?? 0) + row.totalCents);
  }

  const topItemsMap = new Map<
    string,
    { productId?: string; productName: string; quantity: number; revenueCents: number }
  >();

  for (const row of saleItemRows) {
    const key = row.productId ?? row.productName;
    const existing = topItemsMap.get(key);

    if (existing) {
      existing.quantity += row.quantity;
      existing.revenueCents += row.revenueCents;
      continue;
    }

    topItemsMap.set(key, {
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      revenueCents: row.revenueCents,
    });
  }

  const vipCustomersMap = new Map<
    string,
    { customerId?: string; fullName: string; totalSpendCents: number }
  >();

  for (const row of saleRows) {
    const key = row.customerId ?? `guest-${row.saleId}`;
    const fullName = row.customerName ?? "Guest";
    const existing = vipCustomersMap.get(key);

    if (existing) {
      existing.totalSpendCents += row.totalCents;
      continue;
    }

    vipCustomersMap.set(key, {
      customerId: row.customerId ?? undefined,
      fullName,
      totalSpendCents: row.totalCents,
    });
  }

  return SalesReportResponseSchema.parse({
    range: input.range,
    rangeLabel: getRangeLabel(input.range),
    branchCode: input.branchCode,
    revenueCents,
    series: sortSeries(
      [...seriesByLabel.entries()].map(([hour, totalCents]) => ({
        hour,
        totalCents,
      })),
    ),
    topItems: sortByRevenueDescending([...topItemsMap.values()]),
    highValueCustomers: sortByRevenueDescending([...vipCustomersMap.values()]),
    generatedAt: new Date().toISOString(),
  });
}
