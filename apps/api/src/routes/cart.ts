import { Hono } from "hono";
import { db, type DbClient } from "../db/client";
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

    const parsedPayload = PrepareCartRequestSchema.safeParse(payload);

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
