import { z } from "zod";
import {
  BranchCodeSchema,
  BranchNameSchema,
  CurrencyCentsSchema,
  CustomerNameSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
  LoyaltyPointsSchema,
  OptionalBranchScopeSchema,
  PositiveQuantitySchema,
  ProductNameSchema,
  SearchTextSchema,
} from "./common";

export const CustomerProfileQuerySchema = OptionalBranchScopeSchema.extend({
  search: SearchTextSchema.describe(
    "Customer name or lookup text from the cashier prompt.",
  ),
});

export const CustomerRecentPurchaseSchema = z.object({
  saleId: EntityIdSchema,
  branchCode: BranchCodeSchema,
  branchName: BranchNameSchema,
  itemName: ProductNameSchema,
  quantity: PositiveQuantitySchema,
  totalCents: CurrencyCentsSchema,
  purchasedAt: IsoDateTimeSchema,
});

export const CustomerProfileResponseSchema = z.object({
  customerId: EntityIdSchema,
  customerName: CustomerNameSchema,
  email: z.string().email().nullable().optional(),
  loyaltyPoints: LoyaltyPointsSchema.default(0),
  totalSpendCents: CurrencyCentsSchema,
  branchesVisited: z.array(BranchNameSchema).default([]),
  recentPurchases: z.array(CustomerRecentPurchaseSchema).default([]),
  lastSeenAt: IsoDateTimeSchema.optional(),
});

export type CustomerProfileQuery = z.infer<typeof CustomerProfileQuerySchema>;
export type CustomerRecentPurchase = z.infer<
  typeof CustomerRecentPurchaseSchema
>;
export type CustomerProfileResponse = z.infer<
  typeof CustomerProfileResponseSchema
>;
