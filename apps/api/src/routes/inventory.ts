import { Hono } from "hono";
import { InventoryStatusQuerySchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { getInventorySnapshot } from "../services/inventory-service";

export function createInventoryRouter(database: DbClient = db) {
  const router = new Hono();

  router.get("/status", async (context) => {
    const parsedQuery = InventoryStatusQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          message: "Invalid inventory query",
          issues: parsedQuery.error.flatten(),
        },
        400,
      );
    }

    const snapshot = await getInventorySnapshot(database, parsedQuery.data);

    return context.json(snapshot);
  });

  return router;
}
