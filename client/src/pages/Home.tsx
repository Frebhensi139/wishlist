import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, CheckCircle2, Gift, Link2, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const createWishlist = trpc.wishlist.create.useMutation({
    onSuccess: result => {
      toast.success("Wishlist pribadi telah dibuat.");
      setLocation(`/manage/${result.slug}?key=${result.ownerToken}`);
    },
    onError: () => setError("Wishlist belum dapat dibuat. Silakan coba lagi."),
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Berikan nama untuk wishlist-mu terlebih dahulu.");
      return;
    }
    setError("");
    createWishlist.mutate({ title: title.trim(), description });
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#fcfaf7] text-[#29241f]">
      <header className="container flex min-h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-tight"><span className="grid size-9 place-items-center rounded-full bg-[#2d5b55] text-white shadow-[0_8px_22px_-10px_rgba(24,77,70,0.8)]"><Gift className="size-4.5" /></span>rencana.</div>
        <p className="hidden items-center gap-2 text-sm text-[#756a61] sm:flex"><LockKeyhole className="size-4 text-[#2d5b55]" /> Privat, cukup dengan tautan</p>
      </header>

      <main>
        <section className="relative">
          <div className="hero-orb hero-orb--coral" /><div className="hero-orb hero-orb--sage" />
          <div className="container relative grid gap-12 pb-18 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:pb-28 lg:pt-18">
            <div className="max-w-2xl">
              <p className="eyebrow"><Sparkles className="size-3.5" /> WUJUDKAN DENGAN BERSAMA</p>
              <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-[#2b2520] sm:text-6xl lg:text-7xl">Setiap keinginan pantas <span className="text-[#c75f3d]">punya tempat.</span></h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#70665e] sm:text-lg">Buat wishlist pribadi untuk barang, pengalaman, dan rencana kecil. Bagikan satu tautan—orang terdekat dapat membantu menandai progres dan meninggalkan catatan.</p>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#625951]"><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#2d5b55]" /> Tanpa daftar akun</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#2d5b55]" /> Bisa diedit bersama</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#2d5b55]" /> Tautan privat</span></div>
            </div>

            <section aria-labelledby="create-wishlist" className="relative rounded-[1.6rem] border border-[#e5d9cd] bg-white p-5 shadow-[0_28px_80px_-42px_rgba(85,57,37,0.5)] sm:p-7">
              <div className="absolute -right-3 -top-3 grid size-11 place-items-center rounded-full bg-[#c75f3d] text-white shadow-lg"><Sparkles className="size-4" /></div>
              <p className="eyebrow">LANGKAH PERTAMA</p>
              <h2 id="create-wishlist" className="mt-3 font-display text-3xl font-semibold tracking-tight text-[#302923]">Buat wishlist-mu</h2>
              <p className="mt-2 text-sm leading-6 text-[#786e65]">Tautan pengelolaan dan tautan berbagi akan dibuat seketika.</p>
              <form className="mt-6 space-y-4" onSubmit={handleCreate}>
                <div><label htmlFor="wishlist-title" className="mb-2 block text-sm font-semibold text-[#4d443d]">Nama wishlist</label><Input id="wishlist-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Misalnya, Tahun yang ingin dirayakan" maxLength={160} autoFocus /></div>
                <div><label htmlFor="wishlist-description" className="mb-2 block text-sm font-semibold text-[#4d443d]">Sedikit cerita <span className="font-normal text-[#968a80]">(opsional)</span></label><Textarea id="wishlist-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="Untuk apa wishlist ini dibuat?" maxLength={1200} rows={3} /></div>
                {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
                <Button type="submit" disabled={createWishlist.isPending} className="h-11 w-full gap-2 bg-[#2d5b55] text-white hover:bg-[#234a45]">{createWishlist.isPending ? <Loader2 className="size-4 animate-spin" /> : <>Buat & dapatkan tautan <ArrowRight className="size-4" /></>}</Button>
              </form>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#8a7e73]"><LockKeyhole className="mt-0.5 size-3.5 shrink-0" /> Kami tidak meminta email atau kata sandi. Simpan tautan pengelolaanmu setelah dibuat.</p>
            </section>
          </div>
        </section>

        <section className="border-y border-[#e9dfd5] bg-[#f5f0ea] py-12 sm:py-16">
          <div className="container"><div className="max-w-xl"><p className="eyebrow">RINGKAS & BERMAKNA</p><h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">Satu ruang yang menghubungkan rencana dengan perhatian.</h2></div><div className="mt-8 grid gap-4 md:grid-cols-3"><FeatureCard number="01" icon={<Gift className="size-5" />} title="Kumpulkan" text="Simpan keinginan dalam bentuk barang, aktivitas, perjalanan, atau ide apa pun." /><FeatureCard number="02" icon={<Link2 className="size-5" />} title="Bagikan" text="Kirim satu tautan privat kepada orang-orang yang ingin kamu ajak terlibat." /><FeatureCard number="03" icon={<CheckCircle2 className="size-5" />} title="Wujudkan" text="Mereka dapat memperbarui status item dan menambahkan pesan untukmu." /></div></div>
        </section>
      </main>
      <footer className="container flex flex-col gap-2 py-7 text-xs text-[#8a7f75] sm:flex-row sm:items-center sm:justify-between"><span>rencana. — wishlist sederhana untuk hal yang bermakna.</span><span>Dibuat tanpa kebutuhan akun.</span></footer>
    </div>
  );
}

function FeatureCard({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-[#e5d9cd] bg-[#fcfaf7] p-5 transition-transform duration-200 hover:-translate-y-0.5"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-[#e8f0ee] text-[#2d5b55]">{icon}</span><span className="font-display text-sm text-[#baaa9b]">{number}</span></div><h3 className="mt-5 font-display text-2xl font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#746960]">{text}</p></article>;
}
