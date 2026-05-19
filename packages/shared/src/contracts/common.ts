import { z } from "zod";

export const EntityIdSchema = z.string().trim().min(1);

export const TenantSlugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9-]+$/);

export const BranchCodeSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9-]+$/);

export const BranchNameSchema = z.string().trim().min(1);
export const ProductNameSchema = z.string().trim().min(1);
export const CustomerNameSchema = z.string().trim().min(1);
export const SearchTextSchema = z.string().trim().min(1);

export const CurrencyCentsSchema = z.number().int().nonnegative();
export const PositiveQuantitySchema = z.number().int().positive();
export const NonNegativeQuantitySchema = z.number().int().nonnegative();
export const LoyaltyPointsSchema = z.number().int().nonnegative();

export const IsoDateTimeSchema = z
  .string()
  .trim()
  .min(1)
  .describe("ISO 8601 timestamp");

export const TenantScopeSchema = z.object({
  tenantSlug: TenantSlugSchema,
});

export const BranchScopeSchema = TenantScopeSchema.extend({
  branchCode: BranchCodeSchema,
});

export const OptionalBranchScopeSchema = TenantScopeSchema.extend({
  branchCode: BranchCodeSchema.optional(),
});

export type EntityId = z.infer<typeof EntityIdSchema>;
export type TenantSlug = z.infer<typeof TenantSlugSchema>;
export type BranchCode = z.infer<typeof BranchCodeSchema>;
export type BranchName = z.infer<typeof BranchNameSchema>;
export type ProductName = z.infer<typeof ProductNameSchema>;
export type CustomerName = z.infer<typeof CustomerNameSchema>;
export type SearchText = z.infer<typeof SearchTextSchema>;
export type CurrencyCents = z.infer<typeof CurrencyCentsSchema>;
export type PositiveQuantity = z.infer<typeof PositiveQuantitySchema>;
export type NonNegativeQuantity = z.infer<typeof NonNegativeQuantitySchema>;
export type LoyaltyPoints = z.infer<typeof LoyaltyPointsSchema>;
export type IsoDateTime = z.infer<typeof IsoDateTimeSchema>;
export type TenantScope = z.infer<typeof TenantScopeSchema>;
export type BranchScope = z.infer<typeof BranchScopeSchema>;
export type OptionalBranchScope = z.infer<typeof OptionalBranchScopeSchema>;
