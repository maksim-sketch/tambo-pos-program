import { withTamboInteractable } from "@tambo-ai/react";
import {
  PersistentCartPropsSchema,
  type PersistentCartProps,
} from "../ai/tambo-schemas";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function PersistentCartView({
  cartId,
  branchName,
  items,
  subtotalCents,
  taxCents,
  totalCents,
}: PersistentCartProps) {
  // Render directly from the latest props so the pinned cart stays in sync
  // with live tool updates instead of holding onto a stale local snapshot.
  const currentItems = items ?? [];
  const currentSubtotalCents = subtotalCents ?? 0;
  const currentTaxCents = taxCents ?? 0;
  const currentTotalCents = totalCents ?? 0;

  return (
    <div className="surface-card cart-surface">
      <div className="cart-header-row">
        <p className="eyebrow">Active Order</p>
        <span className="cart-id-badge">{cartId}</span>
      </div>

      <p className="cart-branch-name">{branchName ?? "Branch not selected"}</p>

      {currentItems.length === 0 ? (
        <div className="cart-empty-state">
          Ask Tambo to add products and this cart will stay pinned while it
          updates.
        </div>
      ) : (
        <ul className="cart-list">
          {currentItems.map((item, index) => (
            <li key={`${item.id}-${index}`} className="cart-item">
              <div>
                <strong className="cart-item-name">{item.name}</strong>
                <div className="cart-item-meta">
                  {item.quantity} x {formatMoney(item.unitPriceCents)}
                </div>
              </div>
              <span>{formatMoney(item.quantity * item.unitPriceCents)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="summary-list">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatMoney(currentSubtotalCents)}</span>
        </div>
        <div className="summary-row">
          <span>Tax</span>
          <span>{formatMoney(currentTaxCents)}</span>
        </div>
        <div className="summary-row summary-total">
          <span>Total</span>
          <span>{formatMoney(currentTotalCents)}</span>
        </div>
      </div>
    </div>
  );
}

export const PersistentCart = withTamboInteractable(PersistentCartView, {
  componentName: "PersistentCart",
  description:
    "Shows the active checkout cart and stays on screen while the cashier adds or removes products.",
  propsSchema: PersistentCartPropsSchema,
});
