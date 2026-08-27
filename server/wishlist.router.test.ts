import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  addItemNote: vi.fn(),
  createWishlist: vi.fn(),
  createWishlistItem: vi.fn(),
  deleteWishlistItem: vi.fn(),
  getWishlistBySlug: vi.fn(),
  getWishlistDetail: vi.fn(),
  getWishlistForOwner: vi.fn(),
  getWishlistItem: vi.fn(),
  updateWishlistItem: vi.fn(),
}));

import * as db from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const ownerToken = "o".repeat(40);
const slug = "secure-share-slug1";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("wishlist router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("membuat wishlist tanpa mengharuskan pengguna masuk", async () => {
    vi.mocked(db.createWishlist).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext());

    const result = await caller.wishlist.create({ title: "Petualangan 2026" });

    expect(result.slug).toHaveLength(18);
    expect(result.ownerToken).toHaveLength(40);
    expect(db.createWishlist).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Petualangan 2026", description: null }),
    );
  });

  it("menolak pengeditan pemilik saat token pengelolaan tidak cocok", async () => {
    vi.mocked(db.getWishlistForOwner).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.wishlist.addItem({ slug, ownerToken, title: "Kelas memasak" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("memperbarui hanya field item yang secara eksplisit dikirim pemilik", async () => {
    vi.mocked(db.getWishlistForOwner).mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof db.getWishlistForOwner>>);
    vi.mocked(db.updateWishlistItem).mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());

    await expect(
      caller.wishlist.updateItem({ slug, ownerToken, itemId: 3, title: "Kelas keramik" }),
    ).resolves.toEqual({ success: true });
    expect(db.updateWishlistItem).toHaveBeenCalledWith(3, 7, { title: "Kelas keramik" });
  });

  it("menolak pembaruan item tanpa perubahan", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wishlist.updateItem({ slug, ownerToken, itemId: 3 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("mengizinkan penerima link memperbarui status item", async () => {
    vi.mocked(db.getWishlistBySlug).mockResolvedValue({ id: 7 } as Awaited<ReturnType<typeof db.getWishlistBySlug>>);
    vi.mocked(db.updateWishlistItem).mockResolvedValue(true);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.wishlist.updateSharedStatus({ slug, itemId: 3, status: "completed" })).resolves.toEqual({ success: true });
    expect(db.updateWishlistItem).toHaveBeenCalledWith(3, 7, { status: "completed" });
  });
});
