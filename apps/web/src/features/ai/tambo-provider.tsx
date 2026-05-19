import { TamboProvider } from "@tambo-ai/react";
import { useMemo, useRef, type PropsWithChildren } from "react";
import { CustomerLoyaltyCard } from "../customers/CustomerLoyaltyCard";
import { InventoryStatus } from "../inventory/InventoryStatus";
import { PersistentCart } from "../cart/PersistentCart";
import { SalesChart } from "../reports/SalesChart";
import type { RetailBranch } from "./retail-branch";
import { createTamboTools } from "./tambo-tools";
import {
  CustomerLoyaltyCardPropsSchema,
  InventoryStatusPropsSchema,
  PersistentCartPropsSchema,
  SalesChartPropsSchema,
} from "./tambo-schemas";

export const tamboComponents = [
  {
    name: "PersistentCart",
    component: PersistentCart,
    description:
      "Use when the cashier adds items, checks the current order, or asks to update cart totals.",
    propsSchema: PersistentCartPropsSchema,
  },
  {
    name: "InventoryStatus",
    component: InventoryStatus,
    description:
      "Use when the cashier asks for product availability across one or more branches.",
    propsSchema: InventoryStatusPropsSchema,
  },
  {
    name: "CustomerLoyaltyCard",
    component: CustomerLoyaltyCard,
    description:
      "Use when the cashier needs loyalty details, purchase history, or a cross-branch customer profile.",
    propsSchema: CustomerLoyaltyCardPropsSchema,
  },
  {
    name: "SalesChart",
    component: SalesChart,
    description:
      "Use when the cashier or manager asks for today's sales, hourly performance, or top-selling items.",
    propsSchema: SalesChartPropsSchema,
  },
];

interface PosTamboProviderProps extends PropsWithChildren {
  activeBranch: RetailBranch;
  branches: ReadonlyArray<RetailBranch>;
}

export function PosTamboProvider({
  activeBranch,
  branches,
  children,
}: PosTamboProviderProps) {
  const apiKey = import.meta.env.VITE_TAMBO_API_KEY;
  const userKey = import.meta.env.VITE_TAMBO_USER_KEY || "cashier-demo";
  const activeBranchRef = useRef(activeBranch);
  activeBranchRef.current = activeBranch;

  const tools = useMemo(
    () =>
      createTamboTools({
        getActiveBranch: () => activeBranchRef.current,
      }),
    [],
  );
  const contextHelpers = useMemo(
    () => ({
      retail_session: () => ({
        activeBranchCode: activeBranch.code,
        activeBranchName: activeBranch.label,
        availableBranches: branches.map((branch) => ({
          code: branch.code,
          name: branch.label,
        })),
        operatorGuidance:
          "Use the active branch as the current checkout context unless the cashier explicitly asks for another branch.",
      }),
    }),
    [activeBranch.code, activeBranch.label, branches],
  );

  return (
    <TamboProvider
      apiKey={apiKey}
      userKey={userKey}
      components={tamboComponents}
      contextHelpers={contextHelpers}
      tools={tools}
      autoGenerateThreadName={false}
    >
      {children}
    </TamboProvider>
  );
}
