import { z } from "zod";
import {
  BranchCodeSchema,
  CurrencyCentsSchema,
  CustomerNameSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
  NonNegativeQuantitySchema,
  OptionalBranchScopeSchema,
  ProductNameSchema,
} from "./common";

export const SalesReportRangeSchema = z.enum(["today", "week", "month", "year"]);

export const SalesReportQuerySchema = OptionalBranchScopeSchema.extend({
  range: SalesReportRangeSchema.default("today"),
});

export const SalesReportPointSchema = z.object({
  hour: z.string().trim().min(1),
  totalCents: CurrencyCentsSchema,
});

export const SalesReportTopItemSchema = z.object({
  productId: EntityIdSchema.optional(),
  productName: ProductNameSchema,
  quantity: NonNegativeQuantitySchema,
  revenueCents: CurrencyCentsSchema,
});

export const SalesReportVipCustomerSchema = z.object({
  customerId: EntityIdSchema.optional(),
  fullName: CustomerNameSchema,
  totalSpendCents: CurrencyCentsSchema,
});

export const SalesReportResponseSchema = z.object({
  range: SalesReportRangeSchema,
  rangeLabel: z.string().trim().min(1),
  branchCode: BranchCodeSchema.optional(),
  revenueCents: CurrencyCentsSchema,
  series: z.array(SalesReportPointSchema).default([]),
  topItems: z.array(SalesReportTopItemSchema).default([]),
  highValueCustomers: z.array(SalesReportVipCustomerSchema).default([]),
  generatedAt: IsoDateTimeSchema,
});

export type SalesReportRange = z.infer<typeof SalesReportRangeSchema>;
export type SalesReportQuery = z.infer<typeof SalesReportQuerySchema>;
export type SalesReportPoint = z.infer<typeof SalesReportPointSchema>;
export type SalesReportTopItem = z.infer<typeof SalesReportTopItemSchema>;
export type SalesReportVipCustomer = z.infer<
  typeof SalesReportVipCustomerSchema
>;
export type SalesReportResponse = z.infer<typeof SalesReportResponseSchema>;
