import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  ReceiptToastViewport,
  publishReceiptToast,
  resetReceiptToastStore,
} from "./receipt-toast";

describe("ReceiptToastViewport", () => {
  beforeEach(() => {
    resetReceiptToastStore();
  });

  it("renders receipt details when checkout completes", async () => {
    render(<ReceiptToastViewport />);

    publishReceiptToast({
      saleId: "sale-checkout-1",
      branchName: "Branch A",
      totalCents: 880,
      itemCount: 2,
      createdAt: "2026-05-19T09:15:00.000Z",
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      /branch a receipt ready/i,
    );
    expect(screen.getByText(/2 items processed/i)).toBeInTheDocument();
    expect(screen.getByText(/\$8\.80/)).toBeInTheDocument();
  });
});
