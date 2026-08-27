import WishlistItemForm from "@/components/WishlistItemForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { formatPrice, statusMeta, type WishlistItem } from "@/lib/wishlist";
import {
  ArrowLeft,
  Check,
  Clipboard,
  ExternalLink,
  Gift,
  Link2,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

type ItemPayload = {
  title: string;
  description?: string;
  priceCents: number | null;
  externalUrl?: string;
  status: WishlistItem["status"];
};

export default function ManageWishlist() {
  const { slug = "" } = useParams<{ slug: string }>();
  const ownerToken = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("key") ?? "";
  const input = useMemo(() => ({ slug, ownerToken }), [slug, ownerToken]);
  const utils = trpc.useUtils();
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);

  const wishlistQuery = trpc.wishlist.getForOwner.useQuery(input, {
    enabled: Boolean(slug && ownerToken),
    refetchOnWindowFocus: false,
  });
  const refresh = async () => {
    await utils.wishlist.getForOwner.invalidate(input);
    await utils.wishlist.get.invalidate({ slug });
  };
  const addItem = trpc.wishlist.addItem.useMutation({ onSuccess: refresh });
  const updateItem = trpc.wishlist.updateItem.useMutation({ onSuccess: refresh });
  const deleteItem = trpc.wishlist.deleteItem.useMutation({ onSuccess: refresh });

  const sharedLink = typeof window === "undefined" ? "" : `${window.location.origin}/w/${slug}`;
  const managementLink = typeof window === "undefined" ? "" : `${window.location.origin}/manage/${slug}?key=${ownerToken}`;
  const isMutating = addItem.isPending || updateItem.isPending || deleteItem.isPending;

  const copyLink = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch {
      toast.error("Tautan belum dapat disalin. Salin langsung dari kolom tautan.");
    }
  };

  const saveNewItem = async (payload: ItemPayload) => {
    await addItem.mutateAsync({ ...input, ...payload });
    setIsAdding(false);
    toast.success("Item baru telah ditambahkan.");
  };

  const saveExistingItem = async (payload: ItemPayload) => {
    if (!editingItem) return;
    await updateItem.mutateAsync({ ...input, itemId: editingItem.id, ...payload });
    setEditingItem(null);
    toast.success("Perubahan item telah disimpan.");
  };

  const removeItem = async (item: WishlistItem) => {
    if (!window.confirm(`Hapus “${item.title}” dari wishlist?`)) return;
    try {
      await deleteItem.mutateAsync({ ...input, itemId: item.id });
      toast.success("Item telah dihapus.");
    } catch {
      toast.error("Item belum dapat dihapus.");
    }
  };

  if (!ownerToken) {
    return <InvalidManagementLink />;
  }

  if (wishlistQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (wishlistQuery.isError || !wishlistQuery.data) {
    return <InvalidManagementLink />;
  }

  const { wishlist, items } = wishlistQuery.data;

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-[#27231f]">
      <header className="border-b border-[#e8e0d7] bg-[#fcfaf7]/90 backdrop-blur">
        <div className="container flex min-h-18 items-center justify-between gap-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-[#332d27]">
            <span className="grid size-8 place-items-center rounded-full bg-[#2d5b55] text-white"><Gift className="size-4" /></span>
            rencana.
          </Link>
          <div className="hidden items-center gap-2 text-sm text-[#6d6259] sm:flex"><LockKeyhole className="size-4" /> Pengelolaan pribadi</div>
        </div>
      </header>

      <main className="container max-w-6xl py-8 sm:py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#75695f] transition-colors hover:text-[#2d5b55]"><ArrowLeft className="size-4" /> Buat wishlist lain</Link>
        <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <p className="eyebrow">RUANG PENGELOLAAN</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[#27231f] sm:text-5xl">{wishlist.title}</h1>
            {wishlist.description && <p className="mt-4 max-w-xl text-base leading-7 text-[#70665e]">{wishlist.description}</p>}
            <p className="mt-5 flex items-center gap-2 text-sm text-[#75695f]"><Check className="size-4 text-[#2d5b55]" /> Kamu dapat menambah dan merapikan seluruh item di sini.</p>
          </div>
          <Card className="overflow-hidden border-[#e3d7cb] bg-white shadow-[0_18px_50px_-30px_rgba(74,51,37,0.38)]">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="text-sm font-semibold text-[#332d27]">Tautan untuk dibagikan</p>
                <p className="mt-1 text-sm leading-5 text-[#786e65]">Siapa pun yang memiliki tautan dapat memperbarui status dan meninggalkan catatan.</p>
              </div>
              <div className="flex gap-2 rounded-xl border border-[#e5ddd5] bg-[#faf8f5] p-1.5">
                <input readOnly value={sharedLink} aria-label="Tautan wishlist bersama" className="min-w-0 flex-1 bg-transparent px-2 text-xs text-[#635a53] outline-none" />
                <Button size="sm" onClick={() => copyLink(sharedLink, "Tautan bersama telah disalin.")} className="shrink-0 gap-1.5 bg-[#2d5b55] text-white hover:bg-[#234a45]"><Clipboard className="size-3.5" /> Salin</Button>
              </div>
              <div className="rounded-lg bg-[#fff5ea] px-3 py-2.5 text-xs leading-5 text-[#765a3c]"><LockKeyhole className="mr-1 inline size-3.5" /> Simpan halaman ini. Tautan pengelolaan tidak dapat dipulihkan tanpa akun.</div>
              <button type="button" onClick={() => copyLink(managementLink, "Tautan pengelolaan telah disalin.")} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2d5b55] hover:underline"><Link2 className="size-3.5" /> Salin tautan pengelolaan pribadi</button>
            </CardContent>
          </Card>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="eyebrow">DAFTAR KEINGINAN</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{items.length ? `${items.length} hal untuk diwujudkan` : "Mulai dari satu hal kecil"}</h2></div>
            {!isAdding && !editingItem && <Button onClick={() => setIsAdding(true)} className="gap-2 bg-[#c75f3d] px-5 text-white hover:bg-[#ad4e31]"><Plus className="size-4" /> Tambah item</Button>}
          </div>

          {(isAdding || editingItem) && (
            <Card className="mt-6 border-[#dfd2c5] bg-white shadow-[0_18px_50px_-32px_rgba(74,51,37,0.28)]">
              <CardContent className="p-5 sm:p-7">
                <div className="mb-6 flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-[#322b25]">{editingItem ? "Edit item" : "Item baru"}</p><p className="mt-1 text-sm text-[#796f66]">Isi sesuai kebutuhan, dari barang sampai pengalaman.</p></div></div>
                <WishlistItemForm
                  key={editingItem?.id ?? "new-item"}
                  initialItem={editingItem}
                  submitLabel={editingItem ? "Simpan perubahan" : "Tambahkan ke wishlist"}
                  submitting={isMutating}
                  onCancel={() => { setIsAdding(false); setEditingItem(null); }}
                  onSubmit={editingItem ? saveExistingItem : saveNewItem}
                />
              </CardContent>
            </Card>
          )}

          {items.length === 0 && !isAdding ? (
            <EmptyItems onAdd={() => setIsAdding(true)} />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map(item => <OwnerItemCard key={item.id} item={item} onEdit={() => { setEditingItem(item); setIsAdding(false); }} onDelete={() => removeItem(item)} disabled={isMutating} />)}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function OwnerItemCard({ item, onEdit, onDelete, disabled }: { item: WishlistItem; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  const meta = statusMeta(item.status);
  const price = formatPrice(item.priceCents);
  return (
    <article className="group flex min-h-62 flex-col rounded-2xl border border-[#e5ddd5] bg-white p-5 shadow-[0_12px_32px_-25px_rgba(60,42,28,0.48)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}>{meta.label}</span><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={onEdit} disabled={disabled} aria-label={`Edit ${item.title}`} className="size-8 text-[#6f645b] hover:bg-[#f4eee8] hover:text-[#2d5b55]"><Pencil className="size-3.5" /></Button><Button variant="ghost" size="icon" onClick={onDelete} disabled={disabled} aria-label={`Hapus ${item.title}`} className="size-8 text-[#89736a] hover:bg-red-50 hover:text-red-600"><Trash2 className="size-3.5" /></Button></div></div>
      <h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-tight text-[#302923]">{item.title}</h3>
      {item.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#776d64]">{item.description}</p>}
      <div className="mt-auto flex items-end justify-between gap-3 pt-5"><div>{price && <p className="text-sm font-semibold text-[#2d5b55]">{price}</p>}{item.notes.length > 0 && <p className="mt-1 text-xs text-[#8b8076]">{item.notes.length} catatan dari teman</p>}</div>{item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="inline-flex size-9 items-center justify-center rounded-full border border-[#e1d7ce] text-[#6e6259] transition-colors hover:border-[#2d5b55] hover:text-[#2d5b55]" aria-label={`Buka referensi untuk ${item.title}`}><ExternalLink className="size-4" /></a>}</div>
      {item.notes.length > 0 && <div className="mt-4 space-y-2 border-t border-[#eee7e1] pt-4">{item.notes.slice(0, 3).map(note => <div key={note.id} className="rounded-lg bg-[#fcfaf7] px-3 py-2"><p className="text-xs font-semibold text-[#61574f]">{note.authorName || "Seseorang"}</p><p className="mt-0.5 text-xs leading-5 text-[#776d64]">{note.content}</p></div>)}</div>}
    </article>
  );
}

function EmptyItems({ onAdd }: { onAdd: () => void }) {
  return <div className="mt-6 rounded-2xl border border-dashed border-[#d7cabe] bg-[#fffdfb] px-6 py-14 text-center"><span className="mx-auto grid size-11 place-items-center rounded-full bg-[#e7f0ed] text-[#2d5b55]"><Gift className="size-5" /></span><h3 className="mt-4 font-display text-2xl font-semibold">Wishlist ini masih kosong</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#7b7067]">Tambahkan barang, aktivitas, perjalanan, atau gagasan yang ingin kamu wujudkan.</p><Button onClick={onAdd} variant="outline" className="mt-5 gap-2 border-[#cfc2b8] bg-white hover:bg-[#f5f0eb]"><Plus className="size-4" /> Tambah item pertama</Button></div>;
}

function LoadingScreen() {
  return <div className="grid min-h-screen place-items-center bg-[#fcfaf7]"><div className="flex items-center gap-3 text-sm text-[#74685e]"><Loader2 className="size-5 animate-spin text-[#2d5b55]" /> Membuka wishlist…</div></div>;
}

function InvalidManagementLink() {
  return <div className="grid min-h-screen place-items-center bg-[#fcfaf7] px-5"><Card className="max-w-md border-[#e3d6ca] bg-white text-center shadow-[0_20px_60px_-35px_rgba(74,51,37,0.4)]"><CardContent className="p-8"><span className="mx-auto grid size-11 place-items-center rounded-full bg-[#fff1e9] text-[#c75f3d]"><LockKeyhole className="size-5" /></span><h1 className="mt-5 font-display text-3xl font-semibold">Tautan pengelolaan tidak ditemukan</h1><p className="mt-3 text-sm leading-6 text-[#746a61]">Periksa kembali tautan pribadi yang dibuat saat wishlist pertama kali disimpan.</p><Link href="/"><Button className="mt-6 gap-2 bg-[#2d5b55] text-white hover:bg-[#234a45]"><ArrowLeft className="size-4" /> Kembali ke beranda</Button></Link></CardContent></Card></div>;
}
