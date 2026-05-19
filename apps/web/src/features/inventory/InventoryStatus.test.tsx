import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InventoryStatusPropsSchema } from "../ai/tambo-schemas";
import { InventoryStatus } from "./InventoryStatus";

vi.mock("./inventory-sync-store", () => ({
  useLiveInventoryOverlay: vi.fn(() => null),
}));

import { useLiveInventoryOverlay } from "./inventory-sync-store";

describe("InventoryStatus", () => {
  it("fills in a fallback branch name when streamed props are incomplete", () => {
    const props = InventoryStatusPropsSchema.parse({
      productName: "Blue Shirt",
      scopeLabel: "Branch A and Branch B",
      branches: [
        {
          branchCode: "branch-a",
          quantity: 15,
          lowStock: false,
        },
        {
          branchCode: "branch-b",
          branchName: "Branch B",
          quantity: 5,
          lowStock: true,
        },
      ],
      lastUpdatedAt: "Updated now",
    });

    render(<InventoryStatus {...props} />);

    expect(screen.getByText("Branch pending")).toBeInTheDocument();
    expect(screen.getByText("Branch B")).toBeInTheDocument();
  });

  it("avoids React key warnings when branch names are temporarily missing", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const props = InventoryStatusPropsSchema.parse({
        productName: "Blue Shirt",
        scopeLabel: "All branches",
        branches: [
          {
            branchCode: "branch-a",
            quantity: 15,
            lowStock: false,
          },
          {
            branchCode: "branch-b",
            quantity: 5,
            lowStock: true,
          },
        ],
        lastUpdatedAt: "Updated now",
      });

      render(<InventoryStatus {...props} />);

      const keyWarnings = consoleError.mock.calls.filter(([message]) =>
        typeof message === "string"
          ? message.includes('Each child in a list should have a unique "key" prop')
          : false,
      );

      expect(keyWarnings).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("applies live SSE quantity updates to the rendered inventory card", () => {
    vi.mocked(useLiveInventoryOverlay).mockReturnValue({
      branchStates: {
        "branch-a": {
          branchId: "branch-demo-a",
          branchCode: "branch-a",
          branchName: "Branch A",
          quantity: 16,
          lowStock: false,
        },
      },
      lastUpdatedAt: "2026-05-19T12:00:00.000Z",
    });

    render(
      <InventoryStatus
        {...({
          productId: "product-espresso",
          productName: "Espresso",
          scopeLabel: "All branches",
          branches: [
            {
              branchId: "branch-demo-a",
              branchCode: "branch-a",
              branchName: "Branch A",
              quantity: 18,
              lowStock: false,
            },
            {
              branchId: "branch-demo-b",
              branchCode: "branch-b",
              branchName: "Branch B",
              quantity: 8,
              lowStock: false,
            },
          ],
          lastUpdatedAt: "2026-05-19T11:00:00.000Z",
        } as any)}
      />,
    );

    expect(screen.getByText("16")).toBeInTheDocument();
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });
});
