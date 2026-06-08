import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const createId = () => crypto.randomUUID();
const createTimestamp = () => new Date().toISOString();

export const tenants = sqliteTable(
  "tenants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    uniqueIndex("tenants_slug_unique").on(table.slug),
  ],
);

export const branches = sqliteTable(
  "branches",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    uniqueIndex("branches_tenant_code_unique").on(table.tenantId, table.code),
    index("branches_tenant_idx").on(table.tenantId),
  ],
);

export const products = sqliteTable(
  "products",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    isActive: integer("is_active", { mode: "boolean" })
      .notNull()
      .default(true),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    uniqueIndex("products_tenant_sku_unique").on(table.tenantId, table.sku),
    index("products_tenant_name_idx").on(table.tenantId, table.name),
  ],
);

export const inventoryLevels = sqliteTable(
  "inventory_levels",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(0),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    uniqueIndex("inventory_levels_tenant_branch_product_unique").on(
      table.tenantId,
      table.branchId,
      table.productId,
    ),
    index("inventory_levels_branch_idx").on(table.branchId),
    index("inventory_levels_product_idx").on(table.productId),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    email: text("email"),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
    lastSeenAt: text("last_seen_at"),
  },
  (table) => [
    index("customers_tenant_name_idx").on(table.tenantId, table.fullName),
    index("customers_tenant_email_idx").on(table.tenantId, table.email),
  ],
);

export const sales = sqliteTable(
  "sales",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    customerId: text("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    subtotalCents: integer("subtotal_cents").notNull(),
    taxCents: integer("tax_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    index("sales_tenant_branch_idx").on(table.tenantId, table.branchId),
    index("sales_customer_idx").on(table.customerId),
    index("sales_created_at_idx").on(table.createdAt),
  ],
);

export const saleItems = sqliteTable(
  "sale_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    saleId: text("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    index("sale_items_sale_idx").on(table.saleId),
    index("sale_items_product_idx").on(table.productId),
    index("sale_items_tenant_branch_idx").on(table.tenantId, table.branchId),
  ],
);

export const inventoryEvents = sqliteTable(
  "inventory_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    saleId: text("sale_id").references(() => sales.id, {
      onDelete: "set null",
    }),
    quantityBefore: integer("quantity_before").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    quantityDelta: integer("quantity_delta").notNull(),
    reason: text("reason").notNull(),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),
  },
  (table) => [
    index("inventory_events_branch_product_idx").on(
      table.branchId,
      table.productId,
    ),
    index("inventory_events_sale_idx").on(table.saleId),
    index("inventory_events_created_at_idx").on(table.createdAt),
  ],
);

export const posSessions = sqliteTable(
  "pos_sessions",

  {
    id: text("id")
      .primaryKey()
      .$defaultFn(createId),

    token: text("token").notNull(),

    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),

    branchId: text("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),

    createdAt: text("created_at")
      .notNull()
      .$defaultFn(createTimestamp),

    closedAt: text("closed_at")  },
  (table) => [
    uniqueIndex("pos_sessions_token_unique").on(table.token),
    index("pos_sessions_tenant+branch_ids").on(table.tenantId, table.branchId),
  ],
)

export const tenantRelations = relations(tenants, ({ many }) => ({
  branches: many(branches),
  products: many(products),
  customers: many(customers),
  inventoryLevels: many(inventoryLevels),
  sales: many(sales),
  saleItems: many(saleItems),
  inventoryEvents: many(inventoryEvents),
}));

export const branchRelations = relations(branches, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [branches.tenantId],
    references: [tenants.id],
  }),
  inventoryLevels: many(inventoryLevels),
  sales: many(sales),
  saleItems: many(saleItems),
  inventoryEvents: many(inventoryEvents),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  inventoryLevels: many(inventoryLevels),
  saleItems: many(saleItems),
  inventoryEvents: many(inventoryEvents),
}));

export const inventoryLevelRelations = relations(
  inventoryLevels,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryLevels.tenantId],
      references: [tenants.id],
    }),
    branch: one(branches, {
      fields: [inventoryLevels.branchId],
      references: [branches.id],
    }),
    product: one(products, {
      fields: [inventoryLevels.productId],
      references: [products.id],
    }),
  }),
);

export const customerRelations = relations(customers, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [customers.tenantId],
    references: [tenants.id],
  }),
  sales: many(sales),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [sales.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [sales.branchId],
    references: [branches.id],
  }),
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  items: many(saleItems),
  inventoryEvents: many(inventoryEvents),
}));

export const saleItemRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  tenant: one(tenants, {
    fields: [saleItems.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [saleItems.branchId],
    references: [branches.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const inventoryEventRelations = relations(
  inventoryEvents,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [inventoryEvents.tenantId],
      references: [tenants.id],
    }),
    branch: one(branches, {
      fields: [inventoryEvents.branchId],
      references: [branches.id],
    }),
    product: one(products, {
      fields: [inventoryEvents.productId],
      references: [products.id],
    }),
    sale: one(sales, {
      fields: [inventoryEvents.saleId],
      references: [sales.id],
    }),
  }),
);

export const posSessionRelations = relations(posSessions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [posSessions.tenantId],
    references: [tenants.id],
  }),
  branch: one(branches, {
    fields: [posSessions.branchId],
    references: [branches.id],
  })
}));

