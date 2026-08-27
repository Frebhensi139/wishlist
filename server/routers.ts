import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  addItemNote,
  createWishlist,
  createWishlistItem,
  deleteWishlistItem,
  getWishlistDetail,
  getWishlistForOwner,
  getWishlistItem,
  getWishlistBySlug,
  updateWishlistItem,
} from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const statusSchema = z.enum(["wanted", "planned", "purchased", "completed"]);
const slugSchema = z.string().min(12).max(32);
const ownerTokenSchema = z.string().min(24).max(64);
const optionalText = (max: number) => z.string().trim().max(max).optional().transform(value => value || null);
const optionalUrl = z.string().trim().url().max(2048).optional().or(z.literal("")).transform(value => value || null);
const patchableText = (max: number) =>
  z.string().trim().max(max).optional().transform(value => (value === undefined ? undefined : value || null));
const patchableUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .transform(value => (value === undefined ? undefined : value || null));

function presentWishlist(detail: NonNullable<Awaited<ReturnType<typeof getWishlistDetail>>>) {
  return {
    wishlist: {
      slug: detail.wishlist.slug,
      title: detail.wishlist.title,
      description: detail.wishlist.description,
      createdAt: detail.wishlist.createdAt,
      updatedAt: detail.wishlist.updatedAt,
    },
    items: detail.items,
  };
}

async function requireOwner(slug: string, ownerToken: string) {
  const wishlist = await getWishlistForOwner(slug, ownerToken);
  if (!wishlist) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Tautan pengelolaan tidak valid." });
  }
  return wishlist;
}

async function requireSharedWishlist(slug: string) {
  const wishlist = await getWishlistBySlug(slug);
  if (!wishlist) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
  }
  return wishlist;
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  wishlist: router({
    create: publicProcedure
      .input(
        z.object({
          title: z.string().trim().min(1, "Judul wajib diisi.").max(160),
          description: optionalText(1200),
        }),
      )
      .mutation(async ({ input }) => {
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wishlist tidak dapat dibuat." });
      }),
    get: publicProcedure.input(z.object({ slug: slugSchema })).query(async ({ input }) => {
      const detail = await getWishlistDetail(input.slug);
      if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
      return presentWishlist(detail);
    }),
    getForOwner: publicProcedure
      .input(z.object({ slug: slugSchema, ownerToken: ownerTokenSchema }))
      .query(async ({ input }) => {
        await requireOwner(input.slug, input.ownerToken);
        const detail = await getWishlistDetail(input.slug);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND", message: "Wishlist tidak ditemukan." });
        return presentWishlist(detail);
      }),
    addItem: publicProcedure
      .input(
        z.object({
          slug: slugSchema,
          ownerToken: ownerTokenSchema,
          title: z.string().trim().min(1, "Nama item wajib diisi.").max(180),
          description: optionalText(2000),
          priceCents: z.number().int().nonnegative().max(999999999).nullable().optional().transform(value => value ?? null),
          externalUrl: optionalUrl,
          status: statusSchema.default("wanted"),
        }),
      )
      .mutation(async ({ input }) => {
        const wishlist = await requireOwner(input.slug, input.ownerToken);
        await createWishlistItem({
          wishlistId: wishlist.id,
          title: input.title,
          description: input.description,
          priceCents: input.priceCents,
          externalUrl: input.externalUrl,
          status: input.status,
        });
        return { success: true } as const;
      }),
    updateItem: publicProcedure
      .input(
        z
          .object({
            slug: slugSchema,
            ownerToken: ownerTokenSchema,
            itemId: z.number().int().positive(),
            title: z.string().trim().min(1).max(180).optional(),
            description: patchableText(2000),
            priceCents: z.number().int().nonnegative().max(999999999).nullable().optional(),
            externalUrl: patchableUrl,
            status: statusSchema.optional(),
          })
          .refine(input => input.title !== undefined || input.description !== undefined || input.priceCents !== undefined || input.externalUrl !== undefined || input.status !== undefined, {
            message: "Tidak ada perubahan untuk disimpan.",
          }),
      )
      .mutation(async ({ input }) => {
        const wishlist = await requireOwner(input.slug, input.ownerToken);
        const changes = Object.fromEntries(
          Object.entries({
            title: input.title,
            description: input.description,
            priceCents: input.priceCents,
            externalUrl: input.externalUrl,
            status: input.status,
          }).filter(([, value]) => value !== undefined),
        );
        const updated = await updateWishlistItem(input.itemId, wishlist.id, changes);
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
        return { success: true } as const;
      }),
    deleteItem: publicProcedure
      .input(z.object({ slug: slugSchema, ownerToken: ownerTokenSchema, itemId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const wishlist = await requireOwner(input.slug, input.ownerToken);
        const deleted = await deleteWishlistItem(input.itemId, wishlist.id);
        if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
        return { success: true } as const;
      }),
    updateSharedStatus: publicProcedure
      .input(z.object({ slug: slugSchema, itemId: z.number().int().positive(), status: statusSchema }))
      .mutation(async ({ input }) => {
        const wishlist = await requireSharedWishlist(input.slug);
        const updated = await updateWishlistItem(input.itemId, wishlist.id, { status: input.status });
        if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
        return { success: true } as const;
      }),
    addSharedNote: publicProcedure
      .input(
        z.object({
          slug: slugSchema,
          itemId: z.number().int().positive(),
          authorName: optionalText(80),
          content: z.string().trim().min(1, "Catatan tidak boleh kosong.").max(1000),
        }),
      )
      .mutation(async ({ input }) => {
        const wishlist = await requireSharedWishlist(input.slug);
        const item = await getWishlistItem(input.itemId, wishlist.id);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item tidak ditemukan." });
        await addItemNote({ itemId: item.id, authorName: input.authorName, content: input.content });
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
