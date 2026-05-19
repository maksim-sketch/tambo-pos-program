import { z } from "zod";
import {
  BranchCodeSchema,
  BranchNameSchema,
  BranchScopeSchema,
  CurrencyCentsSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
  NonNegativeQuantitySchema,
  PositiveQuantitySchema,
  ProductNameSchema,
  TenantSlugSchema,
} from "./common";

export const CheckoutSaleItemInputSchema = z.object({
  productId: EntityIdSchema.optional(),
  productName: ProductNameSchema,
  quantity: PositiveQuantitySchema,
});

export const CheckoutSaleRequestSchema = BranchScopeSchema.extend({
  cartId: EntityIdSchema.optional(),
  customerId: EntityIdSchema.optional(),
  items: z.array(CheckoutSaleItemInputSchema).min(1),
});

export const CheckoutSaleReceiptItemSchema = z.object({
  productId: EntityIdSchema,
  productName: ProductNameSchema,
  quantity: PositiveQuantitySchema,
  unitPriceCents: CurrencyCentsSchema,
  lineTotalCents: CurrencyCentsSchema,
});

export const CheckoutInventoryDeltaSchema = z.object({
  productId: EntityIdSchema,
  productName: ProductNameSchema,
  quantityBefore: NonNegativeQuantitySchema,
  quantityAfter: NonNegativeQuantitySchema,
  quantityDelta: z.number().int(),
});

export const CheckoutSaleResponseSchema = z.object({
  saleId: EntityIdSchema,
  tenantSlug: TenantSlugSchema,
  branchId: EntityIdSchema,
  branchCode: BranchCodeSchema,
  branchName: BranchNameSchema,
  customerId: EntityIdSchema.nullable().optional(),
  subtotalCents: CurrencyCentsSchema,
  taxCents: CurrencyCentsSchema,
  totalCents: CurrencyCentsSchema,
  items: z.array(CheckoutSaleReceiptItemSchema).min(1),
  inventoryDeltas: z.array(CheckoutInventoryDeltaSchema).default([]),
  createdAt: IsoDateTimeSchema,
});

export type CheckoutSaleItemInput = z.infer<
  typeof CheckoutSaleItemInputSchema
>;
export type CheckoutSaleRequest = z.infer<typeof CheckoutSaleRequestSchema>;
export type CheckoutSaleReceiptItem = z.infer<
  typeof CheckoutSaleReceiptItemSchema
>;
export type CheckoutInventoryDelta = z.infer<
  typeof CheckoutInventoryDeltaSchema
>;
export type CheckoutSaleResponse = z.infer<typeof CheckoutSaleResponseSchema>;
