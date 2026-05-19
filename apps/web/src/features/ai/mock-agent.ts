import { calculateTotalCents } from "../../../../../packages/shared/src";
import type {
  CustomerLoyaltyCardProps,
  InventoryStatusProps,
  PersistentCartProps,
  SalesChartProps,
} from "./tambo-schemas";

export type MockWorkspaceSurface =
  | { kind: "inventory"; props: InventoryStatusProps }
  | { kind: "customer"; props: CustomerLoyaltyCardProps }
  | { kind: "sales"; props: SalesChartProps };

export interface MockConversationEntry {
  id: string;
  command: string;
  reply: string;
  surface?: MockWorkspaceSurface;
}

export interface MockAgentResult {
  reply: string;
  cart?: PersistentCartProps;
  surface?: MockWorkspaceSurface;
}

interface MockAgentOptions {
  branchName: string;
  cartId?: string;
}

function titleCaseName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function createEmptyCart(
  branchName: string,
  cartId = "cart-main",
): PersistentCartProps {
  return {
    cartId,
    branchName,
    items: [],
    subtotalCents: 0,
    taxCents: 0,
    totalCents: 0,
  };
}

export function createDemoCart(
  branchName: string,
  cartId = "cart-main",
): PersistentCartProps {
  const subtotalCents = 800;
  const { taxCents, totalCents } = calculateTotalCents(subtotalCents);

  return {
    cartId,
    branchName,
    items: [
      {
        id: "espresso",
        name: "Espresso",
        quantity: 2,
        unitPriceCents: 400,
      },
    ],
    subtotalCents,
    taxCents,
    totalCents,
  };
}

export function createInventoryDemo(productName = "Blue Shirt"): InventoryStatusProps {
  return {
    productName,
    scopeLabel: "Cross-branch availability",
    branches: [
      {
        branchName: "Branch A",
        quantity: 12,
        lowStock: false,
      },
      {
        branchName: "Branch B",
        quantity: 5,
        lowStock: true,
      },
    ],
    lastUpdatedAt: "Updated 30 seconds ago",
  };
}

export function createCustomerDemoProfile(
  customerName = "Ada Lovelace",
): CustomerLoyaltyCardProps {
  return {
    customerName: titleCaseName(customerName),
    loyaltyPoints: 1280,
    totalSpendCents: 245600,
    branchesVisited: ["Branch A", "Branch B", "Online Pre-Order"],
    recentPurchases: [
      {
        branchName: "Branch A",
        itemName: "Signature Blend Beans",
        totalCents: 1800,
      },
      {
        branchName: "Branch B",
        itemName: "Blue Shirt",
        totalCents: 3200,
      },
      {
        branchName: "Branch A",
        itemName: "Cold Brew",
        totalCents: 650,
      },
    ],
  };
}

export function createSalesDemoSnapshot(): SalesChartProps {
  return {
    rangeLabel: "Today's Sales",
    revenueCents: 48250,
    series: [
      { hour: "08:00", totalCents: 2800 },
      { hour: "10:00", totalCents: 5400 },
      { hour: "12:00", totalCents: 8900 },
      { hour: "14:00", totalCents: 7600 },
      { hour: "16:00", totalCents: 11350 },
      { hour: "18:00", totalCents: 12200 },
    ],
    topItems: [
      { productName: "Espresso", quantity: 28, revenueCents: 11200 },
      { productName: "Blue Shirt", quantity: 9, revenueCents: 28800 },
      { productName: "Cold Brew", quantity: 13, revenueCents: 8450 },
    ],
    highValueCustomers: [
      { fullName: "Ada Lovelace", totalSpendCents: 6400 },
      { fullName: "John Smith", totalSpendCents: 5200 },
      { fullName: "Grace Hopper", totalSpendCents: 4600 },
    ],
  };
}

function normalizeCommand(command: string) {
  return command.trim().toLowerCase();
}

export async function runMockCommand(
  command: string,
  options: MockAgentOptions,
): Promise<MockAgentResult> {
  const normalized = normalizeCommand(command);

  if (/add\s+2\s+espressos?/.test(normalized)) {
    return {
      reply: `Added 2 espressos to the ${options.branchName} cart and refreshed totals.`,
      cart: createDemoCart(options.branchName, options.cartId),
    };
  }

  if (normalized.includes("check stock") && normalized.includes("blue shirt")) {
    return {
      reply:
        "Blue Shirt inventory is synced across both demo branches with a low-stock warning in Branch B.",
      surface: {
        kind: "inventory",
        props: createInventoryDemo(),
      },
    };
  }

  if (
    normalized.includes("pull up profile") ||
    normalized.includes("profile for")
  ) {
    const nameMatch = command.match(/profile for\s+(.+)$/i);
    const customerName = nameMatch?.[1]?.trim() || "Ada Lovelace";

    return {
      reply:
        "Customer history is aggregated across branches so the cashier can see loyalty context immediately.",
      surface: {
        kind: "customer",
        props: createCustomerDemoProfile(customerName),
      },
    };
  }

  if (
    normalized.includes("chart of today's sales") ||
    normalized.includes("today's sales")
  ) {
    return {
      reply:
        "Here is the current revenue snapshot with hourly pacing, top items, and high-value customers.",
      surface: {
        kind: "sales",
        props: createSalesDemoSnapshot(),
      },
    };
  }

  return {
    reply:
      "Try one of the demo prompts: Add 2 espressos, Check stock for Blue Shirt in all branches, Pull up profile for Ada Lovelace, or Show me a chart of today's sales.",
  };
}
