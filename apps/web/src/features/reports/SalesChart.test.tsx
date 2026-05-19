import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SalesChartPropsSchema } from "../ai/tambo-schemas";
import { SalesChart } from "./SalesChart";

describe("SalesChart", () => {
  it("shows an explicit empty-state message for zero-sales reports", () => {
    const props = SalesChartPropsSchema.parse({
      rangeLabel: "Today's Sales",
      revenueCents: 0,
      series: [],
      topItems: [],
      highValueCustomers: [],
    });

    render(<SalesChart {...props} />);

    expect(
      screen.getByText(/no sales were found for this range yet/i),
    ).toBeInTheDocument();
  });

  it("fills in fallback labels when streamed sales props are incomplete", () => {
    const props = SalesChartPropsSchema.parse({
      revenueCents: 13365,
      series: [
        {
          totalCents: 2310,
        },
      ],
      topItems: [
        {
          quantity: 1,
          revenueCents: 3200,
        },
      ],
      highValueCustomers: [
        {
          totalSpendCents: 5940,
        },
      ],
    });

    render(<SalesChart {...props} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Item pending")).toBeInTheDocument();
    expect(screen.getByText("Customer pending")).toBeInTheDocument();
  });

  it("avoids React key warnings when sales labels are temporarily missing", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const props = SalesChartPropsSchema.parse({
        revenueCents: 6545,
        series: [
          {
            totalCents: 2310,
          },
          {
            totalCents: 4235,
          },
        ],
        topItems: [
          {
            quantity: 1,
            revenueCents: 3200,
          },
          {
            quantity: 3,
            revenueCents: 1950,
          },
        ],
        highValueCustomers: [
          {
            totalSpendCents: 4235,
          },
          {
            totalSpendCents: 2310,
          },
        ],
      });

      render(<SalesChart {...props} />);

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
});
