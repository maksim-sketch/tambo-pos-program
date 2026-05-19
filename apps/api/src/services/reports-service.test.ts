import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { getSalesReport } from "./reports-service";

describe("getSalesReport", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns a tenant-wide sales report for today", async () => {
    const report = await getSalesReport(testDb.db, {
      tenantSlug: "demo-retail",
      range: "today",
    });

    expect(report.range).toBe("today");
    expect(report.rangeLabel).toBe("Today's Sales");
    expect(report.revenueCents).toBe(13608);
    expect(report.topItems.slice(0, 2)).toEqual([
      expect.objectContaining({
        productName: "Signature Blend Beans",
        quantity: 3,
        revenueCents: 5400,
      }),
      expect.objectContaining({
        productName: "Blue Shirt",
        quantity: 1,
        revenueCents: 3200,
      }),
    ]);
    expect(report.highValueCustomers.slice(0, 2)).toEqual([
      expect.objectContaining({
        fullName: "John Smith",
        totalSpendCents: 6048,
      }),
      expect.objectContaining({
        fullName: "Ada Lovelace",
        totalSpendCents: 5208,
      }),
    ]);
    expect(report.series).toEqual([
      expect.objectContaining({ hour: "08:00", totalCents: 896 }),
      expect.objectContaining({ hour: "12:00", totalCents: 2352 }),
      expect.objectContaining({ hour: "14:00", totalCents: 4312 }),
      expect.objectContaining({ hour: "18:00", totalCents: 6048 }),
    ]);
    expect(report.generatedAt).toContain("T");
  });

  test("filters sales report to the requested branch when branchCode is present", async () => {
    const report = await getSalesReport(testDb.db, {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      range: "today",
    });

    expect(report.range).toBe("today");
    expect(report.branchCode).toBe("branch-b");
    expect(report.revenueCents).toBe(6664);
    expect(report.topItems.slice(0, 2)).toEqual([
      expect.objectContaining({
        productName: "Blue Shirt",
        quantity: 1,
        revenueCents: 3200,
      }),
      expect.objectContaining({
        productName: "Cold Brew",
        quantity: 3,
        revenueCents: 1950,
      }),
    ]);
    expect(report.highValueCustomers).toEqual([
      expect.objectContaining({
        fullName: "Ada Lovelace",
        totalSpendCents: 4312,
      }),
      expect.objectContaining({
        fullName: "Grace Hopper",
        totalSpendCents: 2352,
      }),
    ]);
    expect(report.series).toEqual([
      expect.objectContaining({ hour: "12:00", totalCents: 2352 }),
      expect.objectContaining({ hour: "14:00", totalCents: 4312 }),
    ]);
  });

  test("returns a year-to-date sales report", async () => {
    const report = await getSalesReport(testDb.db, {
      tenantSlug: "demo-retail",
      range: "year",
    });

    expect(report.range).toBe("year");
    expect(report.rangeLabel).toBe("This Year");
    expect(report.revenueCents).toBe(13608);
    expect(report.topItems[0]).toEqual(
      expect.objectContaining({
        productName: "Signature Blend Beans",
        quantity: 3,
        revenueCents: 5400,
      }),
    );
    expect(report.highValueCustomers[0]).toEqual(
      expect.objectContaining({
        fullName: "John Smith",
        totalSpendCents: 6048,
      }),
    );
    expect(report.series).toHaveLength(1);
    expect(report.series[0]?.hour).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(report.series[0]?.totalCents).toBe(13608);
  });
});
