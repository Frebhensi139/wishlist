// server/vercel-trpc.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { nanoid } from "nanoid";
import { z as z2 } from "zod";

// server/db.ts
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";

// drizzle/schema.ts
import { int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
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
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var wishlists = mysqlTable(
  "wishlists",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 32 }).notNull(),
    ownerToken: varchar("ownerToken", { length: 64 }).notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (table) => [
    uniqueIndex("wishlists_slug_unique").on(table.slug),
    uniqueIndex("wishlists_owner_token_unique").on(table.ownerToken)
  ]
);
var wishlistItems = mysqlTable("wishlistItems", {
  id: int("id").autoincrement().primaryKey(),
  wishlistId: int("wishlistId").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  priceCents: int("priceCents"),
  externalUrl: varchar("externalUrl", { length: 2048 }),
  status: mysqlEnum("status", ["wanted", "planned", "purchased", "completed"]).default("wanted").notNull(),
  position: int("position").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var itemNotes = mysqlTable("itemNotes", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull().references(() => wishlistItems.id, { onDelete: "cascade" }),
  authorName: varchar("authorName", { length: 80 }),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _db = null;
async function getDb() {
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
async function createWishlist(input) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  await db.insert(wishlists).values(input);
}
async function getWishlistBySlug(slug) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.select().from(wishlists).where(eq(wishlists.slug, slug)).limit(1);
  return result[0];
}
async function getWishlistForOwner(slug, ownerToken) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.select().from(wishlists).where(and(eq(wishlists.slug, slug), eq(wishlists.ownerToken, ownerToken))).limit(1);
  return result[0];
}
async function getWishlistDetail(slug) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const wishlist = await getWishlistBySlug(slug);
  if (!wishlist) return void 0;
  const items = await db.select().from(wishlistItems).where(eq(wishlistItems.wishlistId, wishlist.id)).orderBy(asc(wishlistItems.position), desc(wishlistItems.createdAt));
  const itemIds = items.map((item) => item.id);
  const notes = itemIds.length ? await db.select().from(itemNotes).where(inArray(itemNotes.itemId, itemIds)).orderBy(desc(itemNotes.createdAt)) : [];
  const notesByItem = /* @__PURE__ */ new Map();
  notes.forEach((note) => {
    const current = notesByItem.get(note.itemId) ?? [];
    current.push(note);
    notesByItem.set(note.itemId, current);
  });
  return {
    wishlist,
    items: items.map((item) => ({ ...item, notes: notesByItem.get(item.id) ?? [] }))
  };
}
async function createWishlistItem(input) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  await db.insert(wishlistItems).values(input);
}
async function getWishlistItem(itemId, wishlistId) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.select().from(wishlistItems).where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId))).limit(1);
  return result[0];
}
async function updateWishlistItem(itemId, wishlistId, changes) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.update(wishlistItems).set(changes).where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)));
  return result[0].affectedRows > 0;
}
async function deleteWishlistItem(itemId, wishlistId) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  const result = await db.delete(wishlistItems).where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, wishlistId)));
  return result[0].affectedRows > 0;
}
async function addItemNote(input) {
  const db = await getDb();
  if (!db) throw new Error("Database tidak tersedia");
  await db.insert(itemNotes).values(input);
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var statusSchema = z2.enum(["wanted", "planned", "purchased", "completed"]);
var slugSchema = z2.string().min(12).max(32);
var ownerTokenSchema = z2.string().min(24).max(64);
var optionalText = (max) => z2.string().trim().max(max).optional().transform((value) => value || null);
var optionalUrl = z2.string().trim().url().max(2048).optional().or(z2.literal("")).transform((value) => value || null);
var patchableText = (max) => z2.string().trim().max(max).optional().transform((value) => value === void 0 ? void 0 : value || null);
var patchableUrl = z2.string().trim().url().max(2048).optional().or(z2.literal("")).transform((value) => value === void 0 ? void 0 : value || null);
function presentWishlist(detail) {
  return {
    wishlist: {
      slug: detail.wishlist.slug,
      title: detail.wishlist.title,
      description: detail.wishlist.description,
      createdAt: detail.wishlist.createdAt,
      updatedAt: detail.wishlist.updatedAt
    },
    items: detail.items
  };
}
async function requireOwner(slug, ownerToken) {
  const wishlist = await getWishlistForOwner(slug, ownerToken);
  if (!wishlist) {
    throw new TRPCError3({ code: "FORBIDDEN", message: "Tautan pengelolaan tidak valid." });
  }
  return wishlist;
}
async function requireSharedWishlist(slug) {
  const wishlist = await getWishlistBySlug(slug);
  if (!wishlist) {
    throw new TRPCError3({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
  }
  return wishlist;
}
var appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true
      };
    })
  }),
  wishlist: router({
    create: publicProcedure.input(
      z2.object({
        title: z2.string().trim().min(1, "Judul wajib diisi.").max(160),
        description: optionalText(1200)
      })
    ).mutation(async ({ input }) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const slug = nanoid(18);
        const ownerToken = nanoid(40);
        try {
          await createWishlist({ ...input, slug, ownerToken });
          return { slug, ownerToken };
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }
      throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Wishlist tidak dapat dibuat." });
    }),
    get: publicProcedure.input(z2.object({ slug: slugSchema })).query(async ({ input }) => {
      const detail = await getWishlistDetail(input.slug);
      if (!detail) throw new TRPCError3({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
      return presentWishlist(detail);
    }),
    getForOwner: publicProcedure.input(z2.object({ slug: slugSchema, ownerToken: ownerTokenSchema })).query(async ({ input }) => {
      await requireOwner(input.slug, input.ownerToken);
      const detail = await getWishlistDetail(input.slug);
      if (!detail) throw new TRPCError3({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
      return presentWishlist(detail);
    }),
    addItem: publicProcedure.input(
      z2.object({
        slug: slugSchema,
        ownerToken: ownerTokenSchema,
        title: z2.string().trim().min(1, "Nama item wajib diisi.").max(180),
        description: optionalText(2e3),
        priceCents: z2.number().int().nonnegative().max(999999999).nullable().optional().transform((value) => value ?? null),
        externalUrl: optionalUrl,
        status: statusSchema.default("wanted")
      })
    ).mutation(async ({ input }) => {
      const wishlist = await requireOwner(input.slug, input.ownerToken);
      await createWishlistItem({
        wishlistId: wishlist.id,
        title: input.title,
        description: input.description,
        priceCents: input.priceCents,
        externalUrl: input.externalUrl,
        status: input.status
      });
      return { success: true };
    }),
    updateItem: publicProcedure.input(
      z2.object({
        slug: slugSchema,
        ownerToken: ownerTokenSchema,
        itemId: z2.number().int().positive(),
        title: z2.string().trim().min(1).max(180).optional(),
        description: patchableText(2e3),
        priceCents: z2.number().int().nonnegative().max(999999999).nullable().optional(),
        externalUrl: patchableUrl,
        status: statusSchema.optional()
      }).refine((input) => input.title !== void 0 || input.description !== void 0 || input.priceCents !== void 0 || input.externalUrl !== void 0 || input.status !== void 0, {
        message: "Tidak ada perubahan untuk disimpan."
      })
    ).mutation(async ({ input }) => {
      const wishlist = await requireOwner(input.slug, input.ownerToken);
      const changes = Object.fromEntries(
        Object.entries({
          title: input.title,
          description: input.description,
          priceCents: input.priceCents,
          externalUrl: input.externalUrl,
          status: input.status
        }).filter(([, value]) => value !== void 0)
      );
      const updated = await updateWishlistItem(input.itemId, wishlist.id, changes);
      if (!updated) throw new TRPCError3({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
      return { success: true };
    }),
    deleteItem: publicProcedure.input(z2.object({ slug: slugSchema, ownerToken: ownerTokenSchema, itemId: z2.number().int().positive() })).mutation(async ({ input }) => {
      const wishlist = await requireOwner(input.slug, input.ownerToken);
      const deleted = await deleteWishlistItem(input.itemId, wishlist.id);
      if (!deleted) throw new TRPCError3({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
      return { success: true };
    }),
    updateSharedStatus: publicProcedure.input(z2.object({ slug: slugSchema, itemId: z2.number().int().positive(), status: statusSchema })).mutation(async ({ input }) => {
      const wishlist = await requireSharedWishlist(input.slug);
      const updated = await updateWishlistItem(input.itemId, wishlist.id, { status: input.status });
      if (!updated) throw new TRPCError3({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
      return { success: true };
    }),
    addSharedNote: publicProcedure.input(
      z2.object({
        slug: slugSchema,
        itemId: z2.number().int().positive(),
        authorName: optionalText(80),
        content: z2.string().trim().min(1, "Catatan tidak boleh kosong.").max(1e3)
      })
    ).mutation(async ({ input }) => {
      const wishlist = await requireSharedWishlist(input.slug);
      const item = await getWishlistItem(input.itemId, wishlist.id);
      if (!item) throw new TRPCError3({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
      await addItemNote({ itemId: item.id, authorName: input.authorName, content: input.content });
      return { success: true };
    })
  })
});

// server/vercel-trpc.ts
var app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use((req, _res, next) => {
  if (req.url.startsWith("/api/trpc")) {
    req.url = req.url.slice("/api/trpc".length) || "/";
  }
  next();
});
app.use(
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => ({ req, res, user: null })
  })
);
var vercel_trpc_default = app;
export {
  vercel_trpc_default as default
};
