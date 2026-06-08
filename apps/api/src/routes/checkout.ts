import { Hono } from "hono";
import { CheckoutSaleRequestSchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { publishInventoryEventsForReceipt } from "../events/inventory-events";
import type { ActiveSessionContext } from "../services/session-service";
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

    const sessionContext = context.get(
      "sessionContext" as never,
    ) as ActiveSessionContext | undefined;

    if (!sessionContext) {
      return context.json(
        {
          message: "POS session context is missing.",
        },
        500,
      );
    }

    const payloadWithSessionContext =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? {
            ...payload,
            tenantSlug: sessionContext.tenantSlug,
            branchCode: sessionContext.branchCode,
          }
        : {
            tenantSlug: sessionContext.tenantSlug,
            branchCode: sessionContext.branchCode,
          };

    const parsedPayload = CheckoutSaleRequestSchema.safeParse(
      payloadWithSessionContext,
    );

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
