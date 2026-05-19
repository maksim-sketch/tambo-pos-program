import { Hono } from "hono";
import { CheckoutSaleRequestSchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { publishInventoryEventsForReceipt } from "../events/inventory-events";
import { CheckoutServiceError, checkoutSale } from "../services/checkout-service";

export function createCheckoutRouter(database: DbClient = db) {
  const router = new Hono();

  router.post("/", async (context) => {
    let payload: unknown;

    try {
      payload = await context.req.json();
    } catch {
      return context.json(
        {
          message: "Invalid checkout payload",
        },
        400,
      );
    }

    const parsedPayload = CheckoutSaleRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return context.json(
        {
          message: "Invalid checkout payload",
          issues: parsedPayload.error.flatten(),
        },
        400,
      );
    }

    try {
      const receipt = await checkoutSale(database, parsedPayload.data);
      publishInventoryEventsForReceipt(receipt);
      return context.json(receipt, 201);
    } catch (error) {
      if (error instanceof CheckoutServiceError) {
        return context.json(
          {
            message: error.message,
            code: error.code,
          },
          error.statusCode as 404 | 409,
        );
      }

      throw error;
    }
  });

  return router;
}
