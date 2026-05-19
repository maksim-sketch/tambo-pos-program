import { Hono } from "hono";
import { z } from "zod";
import { TenantSlugSchema, type InventoryUpdateEvent } from "../../../../packages/shared/src";
import { subscribeInventoryEvents } from "../events/inventory-events";

const InventoryEventStreamQuerySchema = z.object({
  tenantSlug: TenantSlugSchema,
});

function encodeSseEvent(event: InventoryUpdateEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function createEventsRouter() {
  const router = new Hono();

  router.get("/inventory", async (context) => {
    const parsedQuery = InventoryEventStreamQuerySchema.safeParse(
      context.req.query(),
    );

    if (!parsedQuery.success) {
      return context.json(
        {
          message: "Invalid inventory event query",
          issues: parsedQuery.error.flatten(),
        },
        400,
      );
    }

    const tenantSlug = parsedQuery.data.tenantSlug;
    const encoder = new TextEncoder();

    let closeStream = () => undefined;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let isClosed = false;
        const keepAlive = setInterval(() => {
          if (isClosed) {
            return;
          }

          controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));
        }, 15000);

        const unsubscribe = subscribeInventoryEvents(tenantSlug, (event) => {
          if (isClosed) {
            return;
          }

          controller.enqueue(encoder.encode(encodeSseEvent(event)));
        });

        closeStream = () => {
          if (isClosed) {
            return;
          }

          isClosed = true;
          clearInterval(keepAlive);
          unsubscribe();

          try {
            controller.close();
          } catch {
            // Stream may already be closed by the runtime.
          }
        };

        context.req.raw.signal.addEventListener("abort", closeStream, {
          once: true,
        });
      },
      cancel() {
        closeStream();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  });

  return router;
}
