import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  InsertWishlistItem,
  itemNotes,
  type WishlistItem,
  wishlistItems,
  wishlists,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type WishlistItemWithNotes = WishlistItem & {
  notes: (typeof itemNotes.$inferSelect)[];
};

export type WishlistDetail = {
  wishlist: typeof wishlists.$inferSelect;
  items: WishlistItemWithNotes[];
};

export async function createWishlist(input: {
  slug: string;
  ownerToken: string;
  title: string;
  description: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");

  await db.insert(wishlists).values(input);
}

export async function getWishlistBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");

  const result = await db.select().from(wishlists).where(eq(wishlists.slug, slug)).limit(1);
  return result[0];
}

export async function getWishlistForOwner(slug: string, ownerToken: string) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");

  const result = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.slug, slug), eq(wishlists.ownerToken, ownerToken)))
    .limit(1);
  return result[0];
}

export async function getWishlistDetail(slug: string): Promise<WishlistDetail | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");

  const wishlist = await getWishlistBySlug(slug);
  if (!wishlist) return undefined;

  const items = await db
    .select()
    .from(wishlistItems)
    .where(eq(wishlistItems.wishlistId, wishlist.id))
    .orderBy(asc(wishlistItems.position), desc(wishlistItems.createdAt));

  const itemIds = items.map(item => item.id);
  const notes = itemIds.length
    ? await db.select().from(itemNotes).where(inArray(itemNotes.itemId, itemIds)).orderBy(desc(itemNotes.createdAt))
    : [];
  const notesByItem = new Map<number, (typeof itemNotes.$inferSelect)[]>();

  notes.forEach(note => {
    const current = notesByItem.get(note.itemId) ?? [];
    current.push(note);
    notesByItem.set(note.itemId, current);
  });

  return {
    wishlist,
    items: items.map(item => ({ ...item, notes: notesByItem.get(item.id) ?? [] })),
  };
}

export async function createWishlistItem(input: InsertWishlistItem) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  await db.insert(wishlistItems).values(input);
}

export async function getWishlistItem(itemId: number, wishlistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db
    .select()
    .from(wishlistItems)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)))
    .limit(1);
  return result[0];
}

export async function updateWishlistItem(
  itemId: number,
  wishlistId: number,
  changes: Partial<Pick<InsertWishlistItem, "title" | "description" | "priceCents" | "externalUrl" | "status">>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db
    .update(wishlistItems)
    .set(changes)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)));
  return result[0].affectedRows > 0;
}

export async function deleteWishlistItem(itemId: number, wishlistId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)));
  return result[0].affectedRows > 0;
}

export async function addItemNote(input: { itemId: number; authorName: string | null; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  await db.insert(itemNotes).values(input);
}
