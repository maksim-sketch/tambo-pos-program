import { Hono } from "hono";
import { db, type DbClient } from "../db/client";
import type { ActiveSessionContext } from "../services/session-service";
import {
  PrepareCartRequestSchema,
  PrepareCartServiceError,
  prepareCart,
} from "../services/cart-service";

export function createCartRouter(database: DbClient = db) {
  const router = new Hono();

  router.post("/prepare", async (context) => {
    let payload: unknown;

    try {
      payload = await context.req.json();
    } catch {
      return context.json(
        {
          message: "Invalid cart payload",
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
            branchName: sessionContext.branchName,
          }
        : {
            tenantSlug: sessionContext.tenantSlug,
            branchCode: sessionContext.branchCode,
            branchName: sessionContext.branchName,
          };

    const parsedPayload = PrepareCartRequestSchema.safeParse(
      payloadWithSessionContext,
    );

    if (!parsedPayload.success) {
      return context.json(
        {
          message: "Invalid cart payload",
          issues: parsedPayload.error.flatten(),
        },
        400,
      );
    }

    try {
      const cart = await prepareCart(database, parsedPayload.data);
      return context.json(cart);
    } catch (error) {
      if (error instanceof PrepareCartServiceError) {
        return context.json(
          {
            message: error.message,
            code: error.code,
          },
          error.statusCode as 404,
        );
      }

      throw error;
    }
  });

  return router;
}
