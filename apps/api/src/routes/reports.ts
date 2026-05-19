import { Hono } from "hono";
import { SalesReportQuerySchema } from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { getSalesReport } from "../services/reports-service";

export function createReportsRouter(database: DbClient = db) {
  const router = new Hono();

  router.get("/sales", async (context) => {
    const parsedQuery = SalesReportQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          message: "Invalid sales report query",
          issues: parsedQuery.error.flatten(),
        },
        400,
      );
    }

    const report = await getSalesReport(database, parsedQuery.data);

    return context.json(report);
  });

  return router;
}
