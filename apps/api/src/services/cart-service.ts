import { and, eq, like } from "drizzle-orm";
import { calculateTotalCents } from "../../../../packages/shared/src";
import { z } from "zod";
import { db, type DbClient } from "../db/client";
import { branches, products, tenants } from "../db/schema";

export class PrepareCartServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = "PrepareCartServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const PrepareCartRequestSchema = z.object({
  tenantSlug: z.string().trim().min(1).default("demo-retail"),
  branchCode: z.string().trim().min(1),
  branchName: z.string().trim().min(1).optional(),
  cartId: z.string().trim().min(1).default("cart-main"),
  productName: z.string().trim().min(1),
  quantity: z.number().int().positive().default(1),
});

export const PrepareCartResponseSchema = z.object({
  cartId: z.string().trim().min(1),
  branchName: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        name: z.string().trim().min(1),
        quantity: z.number().int().nonnegative(),
        unitPriceCents: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

export type PrepareCartRequest = z.infer<typeof PrepareCartRequestSchema>;
export type PrepareCartResponse = z.infer<typeof PrepareCartResponseSchema>;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function scoreProductName(productName: string, productQuery: string) {
  const normalizedName = normalizeSearch(productName);
  const normalizedQuery = normalizeSearch(productQuery);

  if (normalizedName === normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 1;
  }

  return 2;
}

export async function prepareCart(
  database: DbClient = db,
  input: PrepareCartRequest,
) {
  const branch = database
    .select({
      tenantId: tenants.id,
      branchCode: branches.code,
      branchName: branches.name,
    })
    .from(branches)
    .innerJoin(tenants, eq(tenants.id, branches.tenantId))
    .where(and(eq(tenants.slug, input.tenantSlug), eq(branches.code, input.branchCode)))
    .get();

  if (!branch) {
    throw new PrepareCartServiceError(
      `Branch ${input.branchCode} was not found in tenant ${input.tenantSlug}.`,
      "BRANCH_NOT_FOUND",
      404,
    );
  }

  const productMatches = database
    .select({
      productId: products.id,
      productName: products.name,
      unitPriceCents: products.priceCents,
    })
    .from(products)
    .where(
      and(
        eq(products.tenantId, branch.tenantId),
        eq(products.isActive, true),
        like(products.name, `%${input.productName.trim()}%`),
      ),
    )
    .all();

  if (productMatches.length === 0) {
    throw new PrepareCartServiceError(
      `No product matched ${input.productName} in this tenant.`,
      "PRODUCT_NOT_FOUND",
      404,
    );
  }

  const product = [...productMatches].sort((left, right) => {
    const scoreDifference =
      scoreProductName(left.productName, input.productName) -
      scoreProductName(right.productName, input.productName);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.productName.localeCompare(right.productName);
  })[0]!;

  const subtotalCents = product.unitPriceCents * input.quantity;
  const { taxCents, totalCents } = calculateTotalCents(subtotalCents);

  return PrepareCartResponseSchema.parse({
    cartId: input.cartId,
    branchName: branch.branchName,
    items: [
      {
        id: product.productId,
        name: product.productName,
        quantity: input.quantity,
        unitPriceCents: product.unitPriceCents,
      },
    ],
    subtotalCents,
    taxCents,
    totalCents,
  });
}
