import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tambo-ai/react", () => ({
  defineTool: <T,>(tool: T) => tool,
}));

vi.mock("../../lib/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

import { apiGet, apiPost } from "../../lib/api";
import {
  getLiveBranchCart,
  resetLiveCartStore,
} from "../cart/live-cart-store";
import {
  peekReceiptToast,
  resetReceiptToastStore,
} from "../notifications/receipt-toast";
import { createTamboTools } from "./tambo-tools";

type SalesTool = {
  name: "getSalesSnapshot";
  tool: (input: {
    branchCode?: string;
    range: string;
  }) => Promise<unknown>;
};

type InventoryTool = {
  name: "checkInventory";
  tool: (input: {
    branchCode?: string;
    productQuery: string;
  }) => Promise<unknown>;
};

type PrepareCartTool = {
  name: "prepareCart";
  tool: (input: {
    productName: string;
    quantity: number;
    branchCode?: string;
    branchName?: string;
  }) => Promise<{
    cartId: string;
    branchName?: string;
  }>;
};

type CheckoutTool = {
  name: "checkoutSale";
  tool: (input: {
    branchCode?: string;
    customerId?: string;
  }) => Promise<{
    branchName: string;
    itemCount: number;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
  }>;
};

describe("createTamboTools", () => {
  const activeBranch = {
    code: "branch-b",
    label: "Branch B",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetLiveCartStore();
    resetReceiptToastStore();
  });

  it("uses the demo tenant and active branch for inventory requests", async () => {
    vi.mocked(apiGet).mockResolvedValue({ ok: true });

    const tools = createTamboTools({
      getActiveBranch: () => activeBranch,
    });
    const inventoryTool = tools.find(
      (tool) => tool.name === "checkInventory",
    ) as InventoryTool | undefined;

    expect(inventoryTool).toBeDefined();

    await inventoryTool!.tool({
      productQuery: "Blue Shirt",
    });

    expect(apiGet).toHaveBeenCalledWith("/api/inventory/status", {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      productQuery: "Blue Shirt",
    });
  });

  it("uses the active branch and demo tenant for sales requests when the model omits branchCode", async () => {
    vi.mocked(apiGet).mockResolvedValue({ ok: true });

    const tools = createTamboTools({
      getActiveBranch: () => activeBranch,
    });
    const salesTool = tools.find(
      (tool) => tool.name === "getSalesSnapshot",
    ) as SalesTool | undefined;

    expect(salesTool).toBeDefined();

    await salesTool!.tool({
      range: "today",
    });

    expect(apiGet).toHaveBeenCalledWith("/api/reports/sales", {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      range: "today",
    });
  });

  it("uses the active branch for cart fallback data instead of a hardcoded branch", async () => {
    vi.mocked(apiPost).mockRejectedValue(new Error("offline"));

    const tools = createTamboTools({
      getActiveBranch: () => activeBranch,
    });
    const prepareCartTool = tools.find(
      (tool) => tool.name === "prepareCart",
    ) as PrepareCartTool | undefined;

    expect(prepareCartTool).toBeDefined();

    const result = await prepareCartTool!.tool({
      productName: "Espresso",
      quantity: 2,
    });

    expect(apiPost).toHaveBeenCalledWith("/api/cart/prepare", {
      branchCode: "branch-b",
      branchName: "Branch B",
      productName: "Espresso",
      quantity: 2,
    });
    expect(result.branchName).toBe("Branch B");
    expect(result.cartId).toBe("cart-main");
    expect(getLiveBranchCart("branch-b", "Branch B")).toMatchObject({
      cartId: "cart-main",
      branchName: "Branch B",
    });
  });

  it("posts the active live cart to checkout, clears the cart, and publishes a receipt toast", async () => {
    vi.mocked(apiPost)
      .mockResolvedValueOnce({
        cartId: "cart-main",
        branchName: "Branch B",
        items: [
          {
            id: "espresso",
            name: "Espresso",
            quantity: 2,
            unitPriceCents: 400,
          },
        ],
        subtotalCents: 800,
        taxCents: 80,
        totalCents: 880,
      })
      .mockResolvedValueOnce({
        saleId: "sale-checkout-1",
        tenantSlug: "demo-retail",
        branchId: "branch-demo-b",
        branchCode: "branch-b",
        branchName: "Branch B",
        customerId: null,
        subtotalCents: 800,
        taxCents: 80,
        totalCents: 880,
        items: [
          {
            productId: "product-espresso",
            productName: "Espresso",
            quantity: 2,
            unitPriceCents: 400,
            lineTotalCents: 800,
          },
        ],
        inventoryDeltas: [
          {
            productId: "product-espresso",
            productName: "Espresso",
            quantityBefore: 8,
            quantityAfter: 6,
            quantityDelta: -2,
          },
        ],
        createdAt: "2026-05-19T09:15:00.000Z",
      });

    const tools = createTamboTools({
      getActiveBranch: () => activeBranch,
    });
    const prepareCartTool = tools.find(
      (tool) => tool.name === "prepareCart",
    ) as PrepareCartTool | undefined;
    const checkoutTool = tools.find(
      (tool) => tool.name === "checkoutSale",
    ) as CheckoutTool | undefined;

    expect(prepareCartTool).toBeDefined();
    expect(checkoutTool).toBeDefined();

    await prepareCartTool!.tool({
      productName: "Espresso",
      quantity: 2,
    });

    const receipt = await checkoutTool!.tool({});

    expect(apiPost).toHaveBeenLastCalledWith("/api/checkout", {
      tenantSlug: "demo-retail",
      branchCode: "branch-b",
      cartId: "cart-main",
      customerId: undefined,
      items: [
        {
          productName: "Espresso",
          quantity: 2,
        },
      ],
    });
    expect(receipt.branchName).toBe("Branch B");
    expect(receipt.itemCount).toBe(2);
    expect(receipt.taxCents).toBe(80);
    expect(getLiveBranchCart("branch-b", "Branch B").items).toEqual([]);
    expect(peekReceiptToast()).toMatchObject({
      saleId: "sale-checkout-1",
      branchName: "Branch B",
      totalCents: 880,
      itemCount: 2,
    });
  });
});
