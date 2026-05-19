import { z } from "zod";
import {
  BranchCodeSchema,
  BranchNameSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
  NonNegativeQuantitySchema,
  OptionalBranchScopeSchema,
  ProductNameSchema,
  TenantSlugSchema,
} from "./common";

export const InventoryStatusQuerySchema = OptionalBranchScopeSchema.extend({
  productQuery: ProductNameSchema.describe(
    "Free-text product lookup for cross-branch stock checks.",
  ),
});

export const InventoryBranchSnapshotSchema = z.object({
  branchId: EntityIdSchema,
  branchCode: BranchCodeSchema,
  branchName: BranchNameSchema,
  quantity: NonNegativeQuantitySchema,
  lowStock: z.boolean(),
});

export const InventoryStatusResponseSchema = z.object({
  productId: EntityIdSchema,
  productName: ProductNameSchema,
  scopeLabel: z.string().trim().min(1).default("All branches"),
  branches: z.array(InventoryBranchSnapshotSchema).default([]),
  lastUpdatedAt: IsoDateTimeSchema,
});

export const InventoryUpdateReasonSchema = z.enum([
  "checkout",
  "restock",
  "adjustment",
]);

export const InventoryUpdateEventSchema = z.object({
  type: z.literal("inventory.updated"),
  tenantSlug: TenantSlugSchema,
  branchId: EntityIdSchema,
  branchCode: BranchCodeSchema,
  branchName: BranchNameSchema,
  productId: EntityIdSchema,
  productName: ProductNameSchema,
  quantity: NonNegativeQuantitySchema,
  quantityDelta: z.number().int(),
  reason: InventoryUpdateReasonSchema,
  occurredAt: IsoDateTimeSchema,
});

export type InventoryStatusQuery = z.infer<typeof InventoryStatusQuerySchema>;
export type InventoryBranchSnapshot = z.infer<
  typeof InventoryBranchSnapshotSchema
>;
export type InventoryStatusResponse = z.infer<
  typeof InventoryStatusResponseSchema
>;
export type InventoryUpdateReason = z.infer<
  typeof InventoryUpdateReasonSchema
>;
export type InventoryUpdateEvent = z.infer<typeof InventoryUpdateEventSchema>;
