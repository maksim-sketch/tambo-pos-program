import { and, eq, isNull } from "drizzle-orm";
import type {
  StartSessionRequest
} from "../../../../packages/shared/src";
import {
  StartSessionResponseSchema,
  EndSessionResponseSchema,
} from "../../../../packages/shared/src";
import { db, type DbClient } from "../db/client";
import { branches, tenants, posSessions } from "../db/schema";

export class SessionServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "SessionServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

//export const getCurrentSessionShrema = z.object({
//  tenantSlug: z.string().trim().min(1),
//  branchCode: z.string().trim().min(1),
//});

export type ActiveSessionContext = {
  sessionId: string;
  sessionToken: string;
  tenantId: string;
  tenantSlug: string;
  branchId: string;
  branchCode: string;
  branchName: string;
  createdAt: string;
};

function createSessionToken() {
  return crypto.randomUUID();
}



export async function startSession( database: DbClient = db, input : StartSessionRequest) {
    const branch = database.select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      branchId: branches.id,
      branchCode: branches.code,
    }).from(branches)
    .innerJoin(tenants, eq(tenants.id, branches.tenantId))
    .where(
      and(
        eq(tenants.slug, input.tenantSlug),
        eq(branches.code, input.branchCode),
      ),
    )
    .get();
     if (!branch) {
    throw new SessionServiceError(
      `Branch ${input.branchCode} was not found in tenant ${input.tenantSlug}.`,
      "BRANCH_NOT_FOUND",
      404,
    );
    }

const sessionToken = createSessionToken();

 const insertedSession = database
    .insert(posSessions)
    .values({
      token: sessionToken,
      tenantId: branch.tenantId,
      branchId: branch.branchId,
    })
    .returning({
      sessionId: posSessions.id,
      sessionToken: posSessions.token,
      tenantId: posSessions.tenantId,
      branchId: posSessions.branchId,
      createdAt: posSessions.createdAt,
    })
    .get();

  if (!insertedSession) {
    throw new SessionServiceError(
      "Failed to create POS session.",
      "SESSION_CREATE_FAILED",
      500,
    );
  }

  return StartSessionResponseSchema.parse({
    sessionId: insertedSession.sessionId,
    sessionToken: insertedSession.sessionToken,
    tenantSlug: branch.tenantSlug,
    branchCode: branch.branchCode,
    createdAt: insertedSession.createdAt,
    endedAt: null,
  });
}

export async function getActiveSessionByToken (database: DbClient = db, sessionToken: string) 
: Promise<ActiveSessionContext> {
    
   if(!sessionToken){
      throw new SessionServiceError(
        "Session token not found.",
        "SESSION_TOKEN_NOT_FOUND",
        401,
      );
    } 

  const session = database
    .select({
      sessionId: posSessions.id,
      sessionToken: posSessions.token,
      tenantId: posSessions.tenantId,
      tenantSlug: tenants.slug,
      branchId: posSessions.branchId,
      branchCode: branches.code,
      branchName: branches.name,
      createdAt: posSessions.createdAt,
    })
    .from(posSessions)
    .innerJoin(tenants, eq(tenants.id, posSessions.tenantId))
    .innerJoin(branches, eq(branches.id, posSessions.branchId))
    .where(and(
        eq(posSessions.token, sessionToken),
        isNull(posSessions.closedAt))
    )
    .get();


    if (!session) {
      throw new SessionServiceError(
        "Active POS session was not found.",
        "SESSION_NOT_FOUND",
    401,
  );
    }

  return session;
}

export async function endSession(database: DbClient = db, sessionToken: string) {

  if (!sessionToken) {
    throw new SessionServiceError(
      "Session token is required.",
      "SESSION_TOKEN_REQUIRED",
      401,
    );
  }

  const session = database
    .update(posSessions)
    .set({ closedAt: new Date().toISOString() })
    .where(and
      (eq(posSessions.token, sessionToken),
      isNull(posSessions.closedAt)))
    .returning({
      sessionId: posSessions.id,
      endedAt: posSessions.closedAt,
    })
    .get();

    if (!session) {
    throw new SessionServiceError(
      "Active POS session was not found.",
      "SESSION_NOT_FOUND",
      401,
    );
  }

  return EndSessionResponseSchema.parse(session);
}
