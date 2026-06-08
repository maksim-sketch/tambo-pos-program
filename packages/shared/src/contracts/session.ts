import { z } from "zod"; 
import {
  BranchCodeSchema,
  TenantSlugSchema,
  EntityIdSchema,
  IsoDateTimeSchema,
} from "./common";

export const SessionTokenSchema = z.string().trim().min(1);

export const StartSessionRequestSchema = z.object({
  tenantSlug: TenantSlugSchema,
  branchCode: BranchCodeSchema,
});

export const SessionScopeSchema = z.object({
  sessionId: EntityIdSchema,
  sessionToken: SessionTokenSchema,
  tenantSlug: TenantSlugSchema,
  branchCode: BranchCodeSchema,
  createdAt: IsoDateTimeSchema,
  endedAt: IsoDateTimeSchema.nullable(),
});

export const StartSessionResponseSchema = SessionScopeSchema;

export const CurrentSessionResponseSchema = SessionScopeSchema;

export const EndSessionResponseSchema = z.object({
  sessionId: EntityIdSchema,
  endedAt: IsoDateTimeSchema,
});

export type StartSessionRequest = z.infer<typeof StartSessionRequestSchema>;
export type StartSessionResponse = z.infer<typeof StartSessionResponseSchema>;
export type CurrentSessionResponse = z.infer<typeof CurrentSessionResponseSchema>;
export type EndSessionResponse = z.infer<typeof EndSessionResponseSchema>;