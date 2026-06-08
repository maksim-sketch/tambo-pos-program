import { Hono } from "hono";
import { SessionTokenSchema, StartSessionRequestSchema} from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { SessionServiceError, startSession, getActiveSessionByToken, endSession } 
from "../services/session-service";

export function startSessionRouter(database: DbClient = db) {
  const router = new Hono();

  router.post("/start-session", async (context) => {
    let sessionContext: unknown;

    try {
      sessionContext = await context.req.json();
    } catch {
      return context.json(
        {
          message: "Invalid session context",
        },
        400,
      );
    }
    const parsedQuery = StartSessionRequestSchema.safeParse(sessionContext);
    if (!parsedQuery.success) {
      return context.json(
        {
          message: "Unable to start session",
          issues: parsedQuery.error.flatten(),
        },
        400,
      );
    }

    try {
  const session = await startSession(database, parsedQuery.data);
  return context.json(session, 201);
} catch (error) {
  if (error instanceof SessionServiceError) {
    return context.json(
      {
        message: error.message,
        code: error.code,
      },
      error.statusCode as 401 | 404 | 500,
    );
  }

  throw error;
}
  });
  return router;
}

export function getActiveSessionByTokenRouter(database: DbClient = db) {
  const router = new Hono();

  router.get("/active-session", async (context) => {
    const sessionToken = context.req.header("x-pos-session-token");
    const parsedToken = SessionTokenSchema.safeParse(sessionToken);
    if (!parsedToken.success) {
      return context.json(
        {
          message: "Session was not found",
          issues: parsedToken.error.flatten(),
        },
        401,
      );
    }  

  try {
  const activeSession = await getActiveSessionByToken(database, parsedToken.data);
  return context.json(activeSession);
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
});
  return router;
}

export function endSessionRouter(database: DbClient = db) {
  const router = new Hono();

  router.post("/end-session", async (context) => {
    const sessionToken = context.req.header("x-pos-session-token");
    const parsedToken = SessionTokenSchema.safeParse(sessionToken);
    if (!parsedToken.success) {
      return context.json(
        {
          message: "Unable to end session",
          issues: parsedToken.error.flatten(),
        },
        401,
      );
    }  
  try {
  const endedSession = await endSession(database, parsedToken.data);
  return context.json(endedSession);
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
});

  return router;
}