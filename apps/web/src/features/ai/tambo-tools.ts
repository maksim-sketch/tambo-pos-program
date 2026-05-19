import { defineTool } from "@tambo-ai/react";
import { z } from "zod";
import { apiGet, apiPost } from "../../lib/api";
import type { RetailBranch } from "./retail-branch";
import {
  createCustomerDemoProfile,
  createDemoCart,
  createInventoryDemo,
  createSalesDemoSnapshot,
} from "./mock-agent";
import {
  clearLiveBranchCart,
  getLiveBranchCart,
  setLiveBranchCart,
} from "../cart/live-cart-store";
import { publishReceiptToast } from "../notifications/receipt-toast";
import {
  CustomerLoyaltyCardPropsSchema,
  InventoryStatusPropsSchema,
  type PersistentCartProps,
  PersistentCartPropsSchema,
  SalesChartPropsSchema,
} from "./tambo-schemas";

const CheckoutReceiptItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  lineTotalCents: z.number().int().nonnegative(),
});

const CheckoutInventoryDeltaSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantityBefore: z.number().int().nonnegative(),
  quantityAfter: z.number().int().nonnegative(),
  quantityDelta: z.number().int(),
});

const CheckoutSaleResponseSchema = z.object({
  saleId: z.string(),
  tenantSlug: z.string(),
  branchId: z.string(),
  branchCode: z.string(),
  branchName: z.string(),
  customerId: z.string().nullable().optional(),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
  items: z.array(CheckoutReceiptItemSchema).default([]),
  inventoryDeltas: z.array(CheckoutInventoryDeltaSchema).default([]),
  createdAt: z.string(),
});

type CheckoutSaleResponse = z.infer<typeof CheckoutSaleResponseSchema>;

const CheckoutSummarySchema = z.object({
  branchName: z.string(),
  itemCount: z.number().int().nonnegative(),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

const DEFAULT_TENANT_SLUG =
  import.meta.env.VITE_TENANT_SLUG ?? "demo-retail";

async function withFallback<T>(action: () => Promise<T>, fallback: () => T | Promise<T>) {
  // Prefer the real backend, but keep demo-safe fallbacks so the workspace
  // remains usable when a route is missing or local services are unavailable.
  try {
    return await action();
  } catch {
    return await fallback();
  }
}

interface CreateTamboToolsOptions {
  getActiveBranch: () => RetailBranch;
}

export function createTamboTools({ getActiveBranch }: CreateTamboToolsOptions) {
  return [
    defineTool({
      name: "prepareCart",
      description:
        "Create or refresh the active cart when a cashier adds known demo products such as Espresso.",
      inputSchema: z.object({
        branchCode: z.string().optional(),
        branchName: z.string().optional(),
        productName: z.string().describe("Product to add to the cart."),
        quantity: z.number().int().positive().default(1),
      }),
      outputSchema: PersistentCartPropsSchema,
      tool: async ({ branchCode, branchName, productName, quantity }) => {
        const activeBranch = getActiveBranch();
        const resolvedBranchCode = branchCode ?? activeBranch.code;
        const resolvedBranchName = branchName ?? activeBranch.label;

        return withFallback(
          async () => {
            const cart = await apiPost<PersistentCartProps>("/api/cart/prepare", {
              branchCode: resolvedBranchCode,
              branchName: resolvedBranchName,
              productName,
              quantity,
            });

            setLiveBranchCart(resolvedBranchCode, cart);

            return cart;
          },
          () => {
            const fallbackCart = createDemoCart(resolvedBranchName);
            setLiveBranchCart(resolvedBranchCode, fallbackCart);
            return fallbackCart;
          },
        );
      },
    }),
    defineTool({
      name: "checkInventory",
      description: "Fetch inventory by product across all branches.",
      inputSchema: z.object({
        branchCode: z.string().optional(),
        productQuery: z.string().describe("Product name the cashier wants to check."),
      }),
      outputSchema: InventoryStatusPropsSchema,
      tool: async ({ branchCode, productQuery }) => {
        const activeBranch = getActiveBranch();
        const resolvedBranchCode = branchCode ?? activeBranch.code;

        return withFallback(
          () =>
            apiGet("/api/inventory/status", {
              tenantSlug: DEFAULT_TENANT_SLUG,
              branchCode: resolvedBranchCode,
              productQuery,
            }),
          () => createInventoryDemo(productQuery),
        );
      },
    }),
    defineTool({
      name: "getCustomerProfile",
      description:
        "Fetch cross-branch loyalty history for a customer by name or search text.",
      inputSchema: z.object({
        branchCode: z.string().optional(),
        search: z.string().describe("Customer name or lookup query."),
      }),
      outputSchema: CustomerLoyaltyCardPropsSchema,
      tool: async ({ branchCode, search }) => {
        const activeBranch = getActiveBranch();
        const resolvedBranchCode = branchCode ?? activeBranch.code;

        return withFallback(
          () =>
            apiGet("/api/customers/profile", {
              tenantSlug: DEFAULT_TENANT_SLUG,
              branchCode: resolvedBranchCode,
              search,
            }),
          () => createCustomerDemoProfile(search),
        );
      },
    }),
    defineTool({
      name: "getSalesSnapshot",
      description: "Fetch the current daily sales summary with top items and VIP customers.",
      inputSchema: z.object({
        branchCode: z.string().optional(),
        range: z.string().default("today"),
      }),
      outputSchema: SalesChartPropsSchema,
      tool: async ({ branchCode, range }) => {
        const activeBranch = getActiveBranch();
        const resolvedBranchCode = branchCode ?? activeBranch.code;

        return withFallback(
          () =>
            apiGet("/api/reports/sales", {
              tenantSlug: DEFAULT_TENANT_SLUG,
              branchCode: resolvedBranchCode,
              range,
            }),
          () => createSalesDemoSnapshot(),
        );
      },
    }),
    defineTool({
      name: "checkoutSale",
      description:
        "Complete the active checkout cart for the selected branch and return a concise cashier-facing receipt summary.",
      inputSchema: z.object({
        branchCode: z.string().optional(),
        customerId: z.string().optional(),
      }),
      outputSchema: CheckoutSummarySchema,
      tool: async ({ branchCode, customerId }) => {
        const activeBranch = getActiveBranch();
        const resolvedBranchCode = branchCode ?? activeBranch.code;
        const fallbackBranchName =
          resolvedBranchCode === activeBranch.code
            ? activeBranch.label
            : activeBranch.label;
        const cart = getLiveBranchCart(resolvedBranchCode, fallbackBranchName);

        if (cart.items.length === 0) {
          throw new Error("The active cart is empty. Add items before checking out.");
        }

        const receipt = await apiPost<CheckoutSaleResponse>("/api/checkout", {
          tenantSlug: DEFAULT_TENANT_SLUG,
          branchCode: resolvedBranchCode,
          cartId: cart.cartId,
          customerId,
          items: cart.items.map((item) => ({
            productName: item.name,
            quantity: item.quantity,
          })),
        });

        clearLiveBranchCart(resolvedBranchCode, receipt.branchName);
        publishReceiptToast({
          saleId: receipt.saleId,
          branchName: receipt.branchName,
          totalCents: receipt.totalCents,
          itemCount: receipt.items.reduce(
            (runningTotal: number, item: CheckoutSaleResponse["items"][number]) =>
              runningTotal + item.quantity,
            0,
          ),
          createdAt: receipt.createdAt,
        });

        return {
          branchName: receipt.branchName,
          itemCount: receipt.items.reduce(
            (runningTotal: number, item: CheckoutSaleResponse["items"][number]) =>
              runningTotal + item.quantity,
            0,
          ),
          subtotalCents: receipt.subtotalCents,
          taxCents: receipt.taxCents,
          totalCents: receipt.totalCents,
        };
      },
    }),
  ];
}
