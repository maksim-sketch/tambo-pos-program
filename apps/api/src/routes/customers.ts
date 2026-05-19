import { Hono } from "hono";
import { CustomerProfileQuerySchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { getCustomerProfile } from "../services/customer-service";

export function createCustomerRouter(database: DbClient = db) {
  const router = new Hono();

  router.get("/profile", async (context) => {
    const parsedQuery = CustomerProfileQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          message: "Invalid customer profile query",
          issues: parsedQuery.error.flatten(),
        },
        400,
      );
    }

    const profile = await getCustomerProfile(database, parsedQuery.data);

    return context.json(profile);
  });

  return router;
}
