import type { CustomerLoyaltyCardProps } from "../ai/tambo-schemas";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CustomerLoyaltyCard({
  customerName,
  loyaltyPoints,
  totalSpendCents,
  branchesVisited,
  recentPurchases,
}: CustomerLoyaltyCardProps) {
  return (
    <section className="surface-card loyalty-surface">
      <div className="workspace-surface-header">
        <div>
          <p className="workspace-surface-label">CRM</p>
          <h3 className="workspace-surface-title">{customerName}</h3>
        </div>

        <div className="loyalty-pill">Loyalty Points: {loyaltyPoints}</div>
      </div>

      <div className="loyalty-stats">
        <article className="loyalty-stat">
          <span className="loyalty-stat-label">Lifetime Spend</span>
          <strong>{formatMoney(totalSpendCents)}</strong>
        </article>

        <article className="loyalty-stat">
          <span className="loyalty-stat-label">Branches Visited</span>
          <strong>{branchesVisited.length}</strong>
        </article>
      </div>

      <div className="surface-section">
        <h4 className="surface-subtitle">Branches Visited</h4>
        <div className="pill-row">
          {branchesVisited.map((branch) => (
            <span key={branch} className="context-pill">
              {branch}
            </span>
          ))}
        </div>
      </div>

      <div className="surface-section">
        <h4 className="surface-subtitle">Recent Purchases</h4>
        <ul className="detail-list">
          {recentPurchases.map((purchase) => (
            <li key={`${purchase.branchName}-${purchase.itemName}`} className="detail-row">
              <div>
                <strong>{purchase.itemName}</strong>
                <p className="branch-note">{purchase.branchName}</p>
              </div>
              <span>{formatMoney(purchase.totalCents)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
