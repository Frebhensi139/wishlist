import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatPrice, statusMeta, statusOptions, type ItemStatus, type WishlistItem } from "@/lib/wishlist";
import { CheckCircle2, ExternalLink, Gift, Link2, Loader2, MessageCircle, Send, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

export default function ShareWishlist() {
  const { slug = "" } = useParams<{ slug: string }>();
  const input = useMemo(() => ({ slug }), [slug]);
  const utils = trpc.useUtils();
  const wishlistQuery = trpc.wishlist.get.useQuery(input, { enabled: Boolean(slug), refetchOnWindowFocus: false });
  const refresh = async () => { await utils.wishlist.get.invalidate(input); };
  const updateStatus = trpc.wishlist.updateSharedStatus.useMutation({ onSuccess: refresh });
  const addNote = trpc.wishlist.addSharedNote.useMutation({ onSuccess: refresh });

  const handleStatus = async (itemId: number, status: ItemStatus) => {
    try {
      await updateStatus.mutateAsync({ slug, itemId, status });
      toast.success("Status item telah diperbarui.");
    } catch {
      toast.error("Status belum dapat diperbarui.");
    }
  };

  if (wishlistQuery.isLoading) return <LoadingScreen />;
  if (wishlistQuery.isError || !wishlistQuery.data) return <MissingWishlist />;
  const { wishlist, items } = wishlistQuery.data;

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-[#29241f]">
      <header className="border-b border-[#e8e0d7] bg-[#fcfaf7]/90 backdrop-blur"><div className="container flex min-h-18 items-center justify-between gap-4 py-3"><Link href="/" className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-[#332d27]"><span className="grid size-8 place-items-center rounded-full bg-[#2d5b55] text-white"><Gift className="size-4" /></span>rencana.</Link><p className="hidden items-center gap-2 text-sm text-[#746a61] sm:flex"><Sparkles className="size-4 text-[#c75f3d]" /> Ruang bersama</p></div></header>
      <main className="container max-w-6xl py-9 sm:py-14">
        <section className="rounded-[1.6rem] bg-[#2d5b55] px-6 py-8 text-white shadow-[0_25px_60px_-35px_rgba(24,77,70,0.85)] sm:px-10 sm:py-11"><p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.12em]"><Link2 className="size-3.5" /> WISHLIST BERSAMA</p><h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-tight sm:text-5xl">{wishlist.title}</h1>{wishlist.description && <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">{wishlist.description}</p>}<p className="mt-6 flex items-center gap-2 text-sm text-white/70"><CheckCircle2 className="size-4" /> Kamu dapat memperbarui status atau meninggalkan catatan untuk setiap item.</p></section>
        <section className="mt-10"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">HAL-HAL YANG INGIN DIWUJUDKAN</p><h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{items.length ? `${items.length} rencana dalam daftar` : "Belum ada item dalam daftar"}</h2></div><p className="text-sm text-[#766c63]">Pilih status atau kirim catatan dengan nama opsional.</p></div>{items.length ? <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{items.map(item => <SharedItemCard key={item.id} item={item} isUpdating={updateStatus.isPending || addNote.isPending} onStatusChange={handleStatus} onAddNote={async values => { await addNote.mutateAsync({ slug, itemId: item.id, ...values }); toast.success("Catatan telah dikirim kepada pemilik."); }} />)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-[#d8ccc0] bg-white px-6 py-14 text-center"><Gift className="mx-auto size-7 text-[#c75f3d]" /><p className="mt-3 font-display text-2xl font-semibold">Pemilik belum menambahkan apa pun</p><p className="mt-2 text-sm text-[#7b7067]">Kunjungi lagi setelah wishlist ini diperbarui.</p></div>}</section>
      </main>
    </div>
  );
}

function SharedItemCard({ item, isUpdating, onStatusChange, onAddNote }: { item: WishlistItem; isUpdating: boolean; onStatusChange: (itemId: number, status: ItemStatus) => Promise<void>; onAddNote: (values: { authorName?: string; content: string }) => Promise<void> }) {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const meta = statusMeta(item.status);
  const price = formatPrice(item.priceCents);
  const submitNote = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!note.trim()) return; setSending(true); try { await onAddNote({ authorName, content: note.trim() }); setNote(""); setAuthorName(""); setShowNoteForm(false); } catch { toast.error("Catatan belum dapat dikirim."); } finally { setSending(false); } };
  return <article className="flex min-h-73 flex-col rounded-2xl border border-[#e5ddd5] bg-white p-5 shadow-[0_12px_34px_-25px_rgba(60,42,28,0.45)]"><div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}>{meta.label}</span>{item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="inline-flex size-8 items-center justify-center rounded-full border border-[#e3d9d0] text-[#72665d] hover:border-[#2d5b55] hover:text-[#2d5b55]" aria-label={`Buka referensi untuk ${item.title}`}><ExternalLink className="size-3.5" /></a>}</div><h3 className="mt-5 font-display text-2xl font-semibold leading-tight tracking-tight text-[#302923]">{item.title}</h3>{item.description && <p className="mt-3 text-sm leading-6 text-[#776d64]">{item.description}</p>}<div className="mt-5 border-t border-[#eee7e1] pt-4"><div className="flex items-center justify-between gap-3"><div>{price && <p className="text-sm font-semibold text-[#2d5b55]">{price}</p>}<p className="mt-1 text-xs text-[#83776e]">Perbarui progres</p></div><select aria-label={`Status ${item.title}`} value={item.status} disabled={isUpdating} onChange={event => void onStatusChange(item.id, event.target.value as ItemStatus)} className="h-9 rounded-lg border border-[#ddd3ca] bg-[#fdfbf9] px-2 text-xs font-medium text-[#4d443d] outline-none focus-visible:ring-2 focus-visible:ring-[#2d5b55]/30">{statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></div><div className="mt-auto pt-5"><button type="button" onClick={() => setShowNoteForm(value => !value)} className="inline-flex items-center gap-2 text-sm font-medium text-[#2d5b55] hover:underline"><MessageCircle className="size-4" /> {showNoteForm ? "Sembunyikan catatan" : "Tambahkan catatan"}</button>{showNoteForm && <form onSubmit={submitNote} className="mt-4 space-y-3 rounded-xl bg-[#f8f5f1] p-3"><Input aria-label="Nama pengirim catatan" value={authorName} onChange={event => setAuthorName(event.target.value)} placeholder="Namamu (opsional)" maxLength={80} className="h-9 bg-white text-sm" /><Textarea aria-label="Isi catatan" value={note} onChange={event => setNote(event.target.value)} placeholder="Tulis pesan untuk pemilik…" maxLength={1000} rows={3} className="bg-white text-sm" /><Button type="submit" size="sm" disabled={sending || !note.trim()} className="w-full gap-2 bg-[#c75f3d] text-white hover:bg-[#ad4e31]">{sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Kirim catatan</Button></form>}{item.notes.length > 0 && <div className="mt-4 space-y-2 border-t border-[#eee7e1] pt-4">{item.notes.slice(0, 3).map(noteItem => <div key={noteItem.id} className="rounded-lg bg-[#fcfaf7] px-3 py-2"><p className="text-xs font-semibold text-[#61574f]">{noteItem.authorName || "Seseorang"}</p><p className="mt-0.5 text-xs leading-5 text-[#776d64]">{noteItem.content}</p></div>)}</div>}</div></article>;
}

function LoadingScreen() { return <div className="grid min-h-screen place-items-center bg-[#fcfaf7]"><div className="flex items-center gap-3 text-sm text-[#74685e]"><Loader2 className="size-5 animate-spin text-[#2d5b55]" /> Membuka wishlist…</div></div>; }
function MissingWishlist() { return <div className="grid min-h-screen place-items-center bg-[#fcfaf7] px-5"><Card className="max-w-md border-[#e3d6ca] bg-white text-center shadow-[0_20px_60px_-35px_rgba(74,51,37,0.4)]"><CardContent className="p-8"><span className="mx-auto grid size-11 place-items-center rounded-full bg-[#fff1e9] text-[#c75f3d]"><Gift className="size-5" /></span><h1 className="mt-5 font-display text-3xl font-semibold">Wishlist tidak ditemukan</h1><p className="mt-3 text-sm leading-6 text-[#746a61]">Mungkin tautan ini salah, tidak lengkap, atau wishlist sudah tidak tersedia.</p><Link href="/"><Button className="mt-6 bg-[#2d5b55] text-white hover:bg-[#234a45]">Buat wishlist baru</Button></Link></CardContent></Card></div>; }
