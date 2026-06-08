import { Hono } from "hono";
import { cors } from "hono/cors";
import { db, type DbClient } from "./db/client";
import { createCartRouter } from "./routes/cart";
import { createCheckoutRouter } from "./routes/checkout";
import { createCustomerRouter } from "./routes/customers";
import { createEventsRouter } from "./routes/events";
import { createInventoryRouter } from "./routes/inventory";
import { createReportsRouter } from "./routes/reports";
import { startSessionRouter, getActiveSessionByTokenRouter, endSessionRouter } 
from "./routes/session";
import { sessionContextMiddleware } from "./middleware/session-context";


function isAllowedDevOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

export function createApp(database: DbClient = db) {
  const app = new Hono();

  // Allow the local Vite frontend to call the API during development.
  app.use(
    "/api/*",
    cors({
      origin: (origin) => {
        if (!origin) {
          return "http://localhost:5173";
        }

        return isAllowedDevOrigin(origin) ? origin : "http://localhost:5173";
      },
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );

  app.use("/api/cart/*", sessionContextMiddleware(database));
  app.use("/api/checkout", sessionContextMiddleware(database));

  app.get("/", (context) =>
    context.json({
      name: "tambo-pos-api",
      status: "ok",
    }),
  );

  app.route("/api/inventory", createInventoryRouter(database));
  app.route("/api/cart", createCartRouter(database));
  app.route("/api/customers", createCustomerRouter(database));
  app.route("/api/reports", createReportsRouter(database));
  app.route("/api/checkout", createCheckoutRouter(database));
  app.route("/api/events", createEventsRouter());
  app.route("/api/session", startSessionRouter(database));
  app.route("/api/session", getActiveSessionByTokenRouter(database));
  app.route("/api/session", endSessionRouter(database));

  return app;
}

export const app = createApp();

export default app;
