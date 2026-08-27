import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Private lists are accessed by an unguessable share slug and owner token, not an account. */
export const wishlists = mysqlTable(
  "wishlists",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 32 }).notNull(),
    ownerToken: varchar("ownerToken", { length: 64 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("wishlists_slug_unique").on(table.slug),
    uniqueIndex("wishlists_owner_token_unique").on(table.ownerToken),
  ],
);

export const wishlistItems = mysqlTable("wishlistItems", {
  id: int("id").autoincrement().primaryKey(),
  wishlistId: int("wishlistId")
    .notNull()
    .references(() => wishlists.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  priceCents: int("priceCents"),
  externalUrl: varchar("externalUrl", { length: 2048 }),
  status: mysqlEnum("status", ["wanted", "planned", "purchased", "completed"])
    .default("wanted")
    .notNull(),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const itemNotes = mysqlTable("itemNotes", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId")
    .notNull()
    .references(() => wishlistItems.id, { onDelete: "cascade" }),
  authorName: varchar("authorName", { length: 80 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Wishlist = typeof wishlists.$inferSelect;
export type InsertWishlist = typeof wishlists.$inferInsert;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;
export type ItemNote = typeof itemNotes.$inferSelect;
