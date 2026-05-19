import { z } from "zod";

const MoneySchema = z.number().int().nonnegative().default(0);

export const CartLineItemSchema = z.object({
  id: z.string().describe("Stable line-item identifier inside the cart."),
  name: z.string().describe("Product display name shown to the cashier."),
  quantity: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe("Quantity of this product currently in the cart."),
  unitPriceCents: z
    .number()
    .int()
    .nonnegative()
    .default(0)
    .describe("Single-item price in cents."),
});

export const PersistentCartPropsSchema = z
  .object({
    cartId: z
      .string()
      .describe("Stable cart identifier used to keep the same cart on screen."),
    branchName: z
      .string()
      .optional()
      .describe("Name of the active branch for this checkout cart."),
    items: z
      .array(CartLineItemSchema)
      .default([])
      .describe("Current cart line items. Keep this array present even while streaming."),
    subtotalCents: MoneySchema.describe("Subtotal in cents before tax."),
    taxCents: MoneySchema.describe("Tax amount in cents."),
    totalCents: MoneySchema.describe("Grand total in cents."),
  })
  .describe(
    "Persistent retail checkout cart that stays visible while items, totals, and branch context update.",
  );

export const InventoryStatusPropsSchema = z
  .object({
    productId: z
      .string()
      .optional()
      .describe("Stable product identifier used for live inventory sync."),
    productName: z
      .string()
      .default("Inventory Status")
      .describe("Display name of the product being checked."),
    scopeLabel: z
      .string()
      .default("All branches")
      .describe("Short explanation of the stock scope being shown."),
    branches: z
      .array(
        z.object({
          branchId: z
            .string()
            .optional()
            .describe("Stable branch identifier when available."),
          branchCode: z
            .string()
            .optional()
            .describe("Branch code used for stable rendering keys."),
          branchName: z
            .string()
            .default("Branch pending")
            .describe("Branch display name."),
          quantity: z
            .number()
            .int()
            .nonnegative()
            .default(0)
            .describe("Units currently available in this branch."),
          lowStock: z
            .boolean()
            .default(false)
            .describe("Whether this branch should be highlighted as low stock."),
        }),
      )
      .default([])
      .describe("Inventory rows grouped by branch."),
    lastUpdatedAt: z
      .string()
      .optional()
      .describe("Human-readable freshness label for the snapshot."),
  })
  .describe(
    "Cross-branch inventory snapshot for a product with low-stock highlighting.",
  );

export const CustomerLoyaltyCardPropsSchema = z
  .object({
    customerName: z
      .string()
      .default("Customer profile")
      .describe("Customer full name."),
    loyaltyPoints: z
      .number()
      .int()
      .nonnegative()
      .default(0)
      .describe("Current loyalty points balance."),
    totalSpendCents: MoneySchema.describe(
      "Lifetime spend across all branches in cents.",
    ),
    branchesVisited: z
      .array(z.string())
      .default([])
      .describe("Branch names where the customer has completed purchases."),
    recentPurchases: z
      .array(
        z.object({
          branchName: z.string().describe("Branch where the purchase happened."),
          itemName: z.string().describe("Line item bought by the customer."),
          totalCents: MoneySchema.describe("Purchase amount in cents."),
        }),
      )
      .default([])
      .describe("Recent purchase history shown to the cashier."),
  })
  .describe("Shared loyalty profile with recent customer activity.");

export const SalesChartPropsSchema = z
  .object({
    rangeLabel: z
      .string()
      .default("Today's Sales")
      .describe("Reporting range label shown above the chart."),
    revenueCents: MoneySchema.describe("Total revenue for the selected range."),
    series: z
      .array(
        z.object({
          hour: z
            .string()
            .default("Pending")
            .describe("Hour label on the chart."),
          totalCents: MoneySchema.describe("Revenue for this point in time."),
        }),
      )
      .default([])
      .describe("Hourly revenue series rendered in the sales chart."),
    topItems: z
      .array(
        z.object({
          productId: z
            .string()
            .optional()
            .describe("Stable item identifier when available."),
          productName: z
            .string()
            .default("Item pending")
            .describe("Name of a top-selling item."),
          quantity: z
            .number()
            .int()
            .nonnegative()
            .default(0)
            .describe("Units sold in the selected range."),
          revenueCents: MoneySchema.describe("Revenue contributed by the item."),
        }),
      )
      .default([])
      .describe("Top-selling items for the chart footer."),
    highValueCustomers: z
      .array(
        z.object({
          customerId: z
            .string()
            .optional()
            .describe("Stable customer identifier when available."),
          fullName: z
            .string()
            .default("Customer pending")
            .describe("Customer display name."),
          totalSpendCents: MoneySchema.describe(
            "Spend contributed by this customer in cents.",
          ),
        }),
      )
      .default([])
      .describe("VIP customers for the selected range."),
  })
  .describe("Sales performance surface with hourly revenue and top performers.");

export type CartLineItem = z.infer<typeof CartLineItemSchema>;
export type PersistentCartProps = z.infer<typeof PersistentCartPropsSchema>;
export type InventoryStatusProps = z.infer<typeof InventoryStatusPropsSchema>;
export type CustomerLoyaltyCardProps = z.infer<
  typeof CustomerLoyaltyCardPropsSchema
>;
export type SalesChartProps = z.infer<typeof SalesChartPropsSchema>;
