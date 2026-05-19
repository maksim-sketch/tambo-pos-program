import type { InventoryStatusProps } from "../ai/tambo-schemas";
import { useLiveInventoryOverlay } from "./inventory-sync-store";

function formatInventoryStatus(lowStock: boolean) {
  return lowStock ? "Low stock alert" : "Healthy stock";
}

function formatUpdatedLabel(value?: string) {
  if (!value) {
    return "Synced moments ago";
  }

  const parsedValue = Date.parse(value);

  if (Number.isNaN(parsedValue)) {
    return value;
  }

  return `Updated ${new Date(value).toLocaleString()}`;
}

export function InventoryStatus({
  productId,
  productName,
  scopeLabel,
  branches,
  lastUpdatedAt,
}: InventoryStatusProps) {
  const liveOverlay = useLiveInventoryOverlay(productId);
  const mergedBranches = branches.map((branch) => {
    const liveBranchState = branch.branchCode
      ? liveOverlay?.branchStates[branch.branchCode]
      : null;

    if (!liveBranchState) {
      return branch;
    }

    return {
      ...branch,
      branchId: liveBranchState.branchId,
      branchCode: liveBranchState.branchCode,
      branchName: liveBranchState.branchName,
      quantity: liveBranchState.quantity,
      lowStock: liveBranchState.lowStock,
    };
  });
  const hasLowStock = mergedBranches.some((branch) => branch.lowStock);
  const syncLabel = formatUpdatedLabel(liveOverlay?.lastUpdatedAt ?? lastUpdatedAt);

  return (
    <section className="surface-card inventory-surface">
      <div className="workspace-surface-header">
        <div>
          <p className="workspace-surface-label">Stock Check</p>
          <h3 className="workspace-surface-title">Inventory Status</h3>
        </div>

        <span
          className={`inventory-pill ${
            hasLowStock ? "inventory-pill-low" : "inventory-pill-healthy"
          }`}
        >
          {hasLowStock ? "Low stock alert" : "Healthy stock"}
        </span>
      </div>

      <p className="surface-support">
        {productName} · {scopeLabel}
      </p>

      <div className="inventory-grid">
        {mergedBranches.map((branch, index) => {
          const branchLabel =
            branch.branchName || branch.branchCode || `Branch ${index + 1}`;
          const branchKey =
            branch.branchId ??
            branch.branchCode ??
            `${branchLabel}-${index}`;

          return (
          <article key={branchKey} className="inventory-branch-card">
            <div>
              <strong>{branchLabel}</strong>
              <p className="branch-note">{formatInventoryStatus(branch.lowStock)}</p>
            </div>

            <div className="inventory-quantity">
              <span className="inventory-quantity-value">{branch.quantity}</span>
              <span className="branch-note">units</span>
            </div>
          </article>
          );
        })}
      </div>

      <p className="surface-footnote">{syncLabel}</p>
    </section>
  );
}
