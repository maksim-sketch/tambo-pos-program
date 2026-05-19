import { useSyncExternalStore } from "react";
import {
  InventoryUpdateEventSchema,
  type InventoryUpdateEvent,
} from "../../../../../packages/shared/src";

interface LiveInventoryBranchState {
  branchId: string;
  branchCode: string;
  branchName: string;
  quantity: number;
  lowStock: boolean;
}

interface LiveInventoryOverlay {
  branchStates: Record<string, LiveInventoryBranchState>;
  lastUpdatedAt: string;
}

type InventoryOverlayMap = Record<string, LiveInventoryOverlay>;

const DEFAULT_TENANT_SLUG =
  import.meta.env.VITE_TENANT_SLUG ?? "demo-retail";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

let inventoryOverlays: InventoryOverlayMap = {};
let currentTenantSlug: string | null = null;
let eventSource: EventSource | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function applyInventoryEvent(event: InventoryUpdateEvent) {
  const currentOverlay = inventoryOverlays[event.productId] ?? {
    branchStates: {},
    lastUpdatedAt: event.occurredAt,
  };

  inventoryOverlays = {
    ...inventoryOverlays,
    [event.productId]: {
      branchStates: {
        ...currentOverlay.branchStates,
        [event.branchCode]: {
          branchId: event.branchId,
          branchCode: event.branchCode,
          branchName: event.branchName,
          quantity: event.quantity,
          lowStock: event.quantity <= 5,
        },
      },
      lastUpdatedAt: event.occurredAt,
    },
  };

  emitChange();
}

function handleInventoryEvent(event: MessageEvent<string>) {
  try {
    const parsedEvent = InventoryUpdateEventSchema.parse(
      JSON.parse(event.data),
    );
    applyInventoryEvent(parsedEvent);
  } catch {
    // Ignore malformed SSE payloads in the client and keep the stream alive.
  }
}

export function connectInventorySync(tenantSlug = DEFAULT_TENANT_SLUG) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return;
  }

  if (eventSource && currentTenantSlug === tenantSlug) {
    return;
  }

  disconnectInventorySync();

  // Keep a lightweight live overlay of branch inventory so already-rendered
  // inventory cards can refresh after checkout without rerunning the prompt.
  eventSource = new EventSource(
    `${API_BASE_URL}/api/events/inventory?tenantSlug=${encodeURIComponent(tenantSlug)}`,
  );
  eventSource.addEventListener("inventory.updated", handleInventoryEvent as EventListener);
  currentTenantSlug = tenantSlug;
}

export function disconnectInventorySync() {
  if (!eventSource) {
    currentTenantSlug = null;
    return;
  }

  eventSource.removeEventListener(
    "inventory.updated",
    handleInventoryEvent as EventListener,
  );
  eventSource.close();
  eventSource = null;
  currentTenantSlug = null;
}

export function resetInventorySyncStore() {
  disconnectInventorySync();
  inventoryOverlays = {};
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getLiveInventoryOverlay(productId?: string) {
  if (!productId) {
    return null;
  }

  return inventoryOverlays[productId] ?? null;
}

export function useLiveInventoryOverlay(productId?: string) {
  return useSyncExternalStore(
    subscribe,
    () => getLiveInventoryOverlay(productId),
    () => getLiveInventoryOverlay(productId),
  );
}
