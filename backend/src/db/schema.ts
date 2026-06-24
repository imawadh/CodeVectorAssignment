import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

/**
 * products table
 *
 * price is stored as an integer in paise (e.g. 29999 = ₹299.99).
 * Formatting to rupees happens only in the frontend.
 */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    price: integer("price").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Default browsing: ORDER BY created_at DESC, id DESC
    index("idx_products_created_at_id").on(table.createdAt.desc(), table.id.desc()),
    // Filtered browsing: WHERE category = ? ORDER BY created_at DESC, id DESC
    index("idx_products_category_created_at_id").on(
      table.category,
      table.createdAt.desc(),
      table.id.desc()
    ),
  ]
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
