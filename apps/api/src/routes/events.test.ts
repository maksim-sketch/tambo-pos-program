import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { seedDemoData } from "../db/seed";
import { createTestDb, type TestDbHandle } from "../test/test-db";
import { createApp } from "../app";

describe("inventory event stream", () => {
  let testDb: TestDbHandle;

  beforeEach(async () => {
    testDb = await createTestDb();
    seedDemoData(testDb.db);
  });

  afterEach(async () => {
    await testDb.dispose();
  });

  test("streams tenant-scoped inventory updates after checkout", async () => {
    const app = createApp(testDb.db);
    const response = await app.request(
      "/api/events/inventory?tenantSlug=demo-retail",
      {
        headers: {
          accept: "text/event-stream",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const checkoutResponse = await app.request("/api/checkout", {
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
            quantity: 2,
          },
        ],
      }),
    });

    expect(checkoutResponse.status).toBe(201);

    const chunk = await reader!.read();
    const payload = new TextDecoder().decode(chunk.value);

    expect(payload).toContain("event: inventory.updated");
    expect(payload).toContain('"tenantSlug":"demo-retail"');
    expect(payload).toContain('"branchCode":"branch-a"');
    expect(payload).toContain('"productName":"Espresso"');
    expect(payload).toContain('"quantity":16');
    expect(payload).toContain('"quantityDelta":-2');

    await reader!.cancel();
  });
});
