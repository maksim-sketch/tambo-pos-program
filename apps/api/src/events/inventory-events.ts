import {
  InventoryUpdateEventSchema,
  type CheckoutSaleResponse,
  type InventoryUpdateEvent,
} from "../../../../packages/shared/src";

type InventoryEventListener = (event: InventoryUpdateEvent) => void;

const tenantListeners = new Map<string, Set<InventoryEventListener>>();

function getTenantListeners(tenantSlug: string) {
  const existingListeners = tenantListeners.get(tenantSlug);

  if (existingListeners) {
    return existingListeners;
  }

  const nextListeners = new Set<InventoryEventListener>();
  tenantListeners.set(tenantSlug, nextListeners);
  return nextListeners;
}

export function subscribeInventoryEvents(
  tenantSlug: string,
  listener: InventoryEventListener,
) {
  const listeners = getTenantListeners(tenantSlug);
  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      tenantListeners.delete(tenantSlug);
    }
  };
}

export function publishInventoryEvent(event: InventoryUpdateEvent) {
  const parsedEvent = InventoryUpdateEventSchema.parse(event);
  const listeners = tenantListeners.get(parsedEvent.tenantSlug);

  if (!listeners) {
    return;
  }

  for (const listener of listeners) {
    listener(parsedEvent);
  }
}

export function publishInventoryEventsForReceipt(
  receipt: CheckoutSaleResponse,
) {
  for (const delta of receipt.inventoryDeltas) {
    publishInventoryEvent({
      type: "inventory.updated",
      tenantSlug: receipt.tenantSlug,
      branchId: receipt.branchId,
      branchCode: receipt.branchCode,
      branchName: receipt.branchName,
      productId: delta.productId,
      productName: delta.productName,
      quantity: delta.quantityAfter,
      quantityDelta: delta.quantityDelta,
      reason: "checkout",
      occurredAt: receipt.createdAt,
    });
  }
}

export function resetInventoryEventBroadcaster() {
  tenantListeners.clear();
}
