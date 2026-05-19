import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createReportsRouter } from "./reports";

describe("createReportsRouter", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("returns sales report JSON for a valid query", async () => {
    const router = createReportsRouter(testDb.db);
    const response = await router.request(
      "http://localhost/sales?tenantSlug=demo-retail&range=today",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      range: "today",
      rangeLabel: "Today's Sales",
      revenueCents: 13608,
    });
    expect(body.series).toHaveLength(4);
  });

  test("accepts year as a valid sales report range", async () => {
    const router = createReportsRouter(testDb.db);
    const response = await router.request(
      "http://localhost/sales?tenantSlug=demo-retail&range=year",
    );

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body).toMatchObject({
      range: "year",
      rangeLabel: "This Year",
      revenueCents: 13608,
    });
  });

  test("rejects invalid sales report queries", async () => {
    const router = createReportsRouter(testDb.db);
    const response = await router.request(
      "http://localhost/sales?tenantSlug=demo-retail&range=quarter",
    );

    expect(response.status).toBe(400);

    const body = await response.json();

    expect(body).toMatchObject({
      message: "Invalid sales report query",
    });
  });
});
