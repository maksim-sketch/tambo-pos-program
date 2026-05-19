import type { SalesChartProps } from "../ai/tambo-schemas";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function SalesChart({
  rangeLabel = "Sales Report",
  revenueCents = 0,
  series = [],
  topItems = [],
  highValueCustomers = [],
}: SalesChartProps) {
  const safeSeries = series ?? [];
  const safeTopItems = topItems ?? [];
  const safeHighValueCustomers = highValueCustomers ?? [];
  const maxValue = Math.max(
    1,
    ...safeSeries.map((point) => point?.totalCents ?? 0),
  );
  const isEmptyReport =
    revenueCents === 0 &&
    safeSeries.length === 0 &&
    safeTopItems.length === 0 &&
    safeHighValueCustomers.length === 0;

  return (
    <section className="surface-card sales-surface">
      <div className="workspace-surface-header">
        <div>
          <p className="workspace-surface-label">Reporting</p>
          <h3 className="workspace-surface-title">{rangeLabel}</h3>
        </div>

        <div className="sales-pill">{formatMoney(revenueCents)}</div>
      </div>

      {isEmptyReport ? (
        <div className="surface-section">
          <p className="surface-support">
            No sales were found for this range yet. Try a wider range or reseed the
            demo database if you want fresh same-day activity.
          </p>
        </div>
      ) : null}

      <div className="surface-section">
        <h4 className="surface-subtitle">Hourly Revenue</h4>

        <div className="sales-bars">
          {safeSeries.map((point, index) => {
            const hourLabel = point?.hour || `Pending ${index + 1}`;

            return (
            <div key={hourLabel} className="sales-bar-row">
              <span className="sales-bar-label">{hourLabel}</span>
              <div className="sales-bar-track">
                <div
                  className="sales-bar-fill"
                  style={{
                    width: `${Math.max(
                      8,
                      Math.round(((point?.totalCents ?? 0) / maxValue) * 100),
                    )}%`,
                  }}
                />
              </div>
              <span className="sales-bar-value">
                {formatMoney(point?.totalCents ?? 0)}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      <div className="sales-detail-grid">
        <div className="surface-section">
          <h4 className="surface-subtitle">Top Items</h4>
          <ul className="detail-list">
            {safeTopItems.map((item, index) => {
              const productLabel =
                item?.productName || item?.productId || `Item ${index + 1}`;
              const productKey =
                item?.productId ?? item?.productName ?? `top-item-${index}`;

              return (
              <li key={productKey} className="detail-row">
                <div>
                  <strong>{productLabel}</strong>
                  <p className="branch-note">{item?.quantity ?? 0} sold</p>
                </div>
                <span>{formatMoney(item?.revenueCents ?? 0)}</span>
              </li>
              );
            })}
          </ul>
        </div>

        <div className="surface-section">
          <h4 className="surface-subtitle">VIP Customers</h4>
          <ul className="detail-list">
            {safeHighValueCustomers.map((customer, index) => {
              const customerLabel =
                customer?.fullName || customer?.customerId || `Customer ${index + 1}`;
              const customerKey =
                customer?.customerId ??
                customer?.fullName ??
                `vip-customer-${index}`;

              return (
              <li key={customerKey} className="detail-row">
                <strong>{customerLabel}</strong>
                <span>{formatMoney(customer?.totalSpendCents ?? 0)}</span>
              </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
