import { useEffect, useSyncExternalStore } from "react";

interface ReceiptToast {
  id: string;
  saleId: string;
  branchName: string;
  totalCents: number;
  itemCount: number;
  createdAt: string;
}

let currentToast: ReceiptToast | null = null;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatItemCount(itemCount: number) {
  return `${itemCount} item${itemCount === 1 ? "" : "s"}`;
}

export function publishReceiptToast(toast: Omit<ReceiptToast, "id">) {
  currentToast = {
    ...toast,
    id: `receipt-${toast.saleId}-${Date.now()}`,
  };
  emitChange();
}

export function dismissReceiptToast() {
  currentToast = null;
  emitChange();
}

export function peekReceiptToast() {
  return currentToast;
}

export function resetReceiptToastStore() {
  currentToast = null;
  emitChange();
}

function useReceiptToast() {
  return useSyncExternalStore(subscribe, () => currentToast, () => currentToast);
}

export function ReceiptToastViewport() {
  const toast = useReceiptToast();

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      dismissReceiptToast();
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [toast]);

  if (!toast) {
    return null;
  }

  return (
    <div className="receipt-toast-viewport" aria-live="polite">
      <div className="receipt-toast-card" role="status">
        <div className="receipt-toast-header">
          <span className="receipt-toast-pill">Checkout complete</span>
          <button
            aria-label="Dismiss receipt toast"
            className="receipt-toast-dismiss"
            onClick={dismissReceiptToast}
            type="button"
          >
            Dismiss
          </button>
        </div>

        <h3 className="receipt-toast-title">{toast.branchName} receipt ready</h3>
        <p className="receipt-toast-copy">
          {formatItemCount(toast.itemCount)} processed for{" "}
          <strong>{formatMoney(toast.totalCents)}</strong>.
        </p>
        <p className="receipt-toast-meta">
          Sale {toast.saleId} · {new Date(toast.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
