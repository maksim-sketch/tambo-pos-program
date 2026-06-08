import { SessionTokenSchema } from "../../../../packages/shared/src";
import { SessionTokenHeader } from "../../../../packages/shared/src/constants/session";
import { db, type DbClient } from "../db/client";
import {
  getActiveSessionByToken,
  SessionServiceError,
} from "../services/session-service";
import type { MiddlewareHandler } from "hono";

export function sessionContextMiddleware(database: DbClient = db) : MiddlewareHandler {
  return async (context, next) => {
    const sessionToken = context.req.header(SessionTokenHeader);

    const parsedToken = SessionTokenSchema.safeParse(sessionToken);

    if (!parsedToken.success) {
      return context.json(
        {
          message: "Missing or invalid session token",
          issues: parsedToken.error.flatten(),
        },
        401,
      );
    }

    try {
      const activeSession = await getActiveSessionByToken(
        database,
        parsedToken.data,
      );

      context.set("sessionContext", activeSession);

      await next();
    } catch (error) {
      if (error instanceof SessionServiceError) {
        return context.json(
          {
            message: error.message,
            code: error.code,
          },
          error.statusCode as 401 | 404,
        );
      }

      throw error;
    }
  };
}