# rencana. — Wishlist Bersama

`rencana.` adalah aplikasi wishlist kolaboratif tanpa registrasi. Pengguna membuat sebuah wishlist dan segera menerima dua tautan: **tautan bersama** untuk dibagikan dan **tautan pengelolaan pribadi** untuk mengatur isi wishlist. Siapa pun yang mendapat tautan bersama dapat membuka wishlist, memperbarui status item, dan meninggalkan catatan tanpa membuat akun.

> **Penting:** Tautan bersama berfungsi sebagai kunci akses. Bagikan hanya kepada orang yang Anda percayai, karena siapa pun yang memilikinya dapat mengubah status item dan menambah catatan. Tautan pengelolaan memberi akses tambahan untuk menambah, mengubah, serta menghapus item dan perlu disimpan oleh pembuat wishlist.

## Fitur

| Area | Kemampuan |
|---|---|
| Pembuatan | Membuat wishlist dengan nama dan deskripsi opsional tanpa registrasi, lalu menghasilkan URL unik seketika. |
| Pengelolaan pemilik | Menambah, mengedit, serta menghapus item yang dapat berupa produk, aktivitas, pengalaman, atau rencana lain. |
| Detail item | Menyimpan nama, deskripsi, harga rupiah opsional, tautan referensi opsional, dan status. |
| Kolaborasi | Penerima link dapat menetapkan status `Diinginkan`, `Direncanakan`, `Sudah dibeli`, atau `Selesai`, serta mengirim catatan bernama atau anonim. |
| Umpan balik | Status dan catatan tersimpan di database dan tersedia bagi pemilik serta penerima link. Notifikasi kecil dalam aplikasi mengonfirmasi perubahan. |
| Tampilan | Antarmuka kartu responsif dengan gaya editorial hangat untuk perangkat desktop dan mobile. |

## Teknologi

| Lapisan | Implementasi |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Wouter, TanStack Query, dan tRPC React. |
| Backend | Node.js, Express 4, tRPC 11, Zod, dan Nano ID. |
| Database | MySQL/TiDB kompatibel melalui Drizzle ORM. |
| Pengujian | Vitest. |

## Menjalankan Secara Lokal

Pastikan Node.js 22 atau lebih baru, `pnpm`, dan sebuah database MySQL/TiDB tersedia. Salin proyek, instal dependensi, lalu berikan nilai variabel lingkungan berikut pada file `.env` lokal Anda.

```bash
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/wishlist_bersama
JWT_SECRET=ganti-dengan-random-string-yang-panjang
```

Setelah koneksi database tersedia, hasilkan lalu terapkan migrasi. Proyek sudah menyertakan migrasi awal di `drizzle/0001_careful_purifiers.sql`.

```bash
pnpm install
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm dev
```

Aplikasi pengembangan akan tersedia pada alamat yang dicetak oleh server. Untuk memeriksa kualitas kode dan pengujian, jalankan perintah berikut.

```bash
pnpm check
pnpm test
pnpm build
```

## Deploy ke Vercel

Repositori ini telah disiapkan untuk Vercel melalui `vercel.json`. Konfigurasi tersebut membangun aset React ke `dist/public`, membundel sumber fungsi `server/vercel-trpc.ts` menjadi `api/trpc/[...trpc].js`, menyajikan deep link halaman SPA seperti `/w/:slug`, dan menjalankan fungsi tersebut untuk seluruh API tRPC. Dengan demikian, folder `dist` yang juga berisi berkas server lokal tidak lagi disajikan sebagai halaman web.

Pada halaman impor proyek Vercel, gunakan root repository (kosong atau `./`). Nilai `vercel.json` akan menetapkan perintah instalasi, build, dan output secara otomatis.

| Pengaturan Vercel | Nilai |
|---|---|
| Root Directory | Kosong atau `./` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build:vercel` |
| Output Directory | `dist/public` |

Sebelum redeploy, tambahkan variabel `DATABASE_URL` di **Project Settings → Environment Variables** untuk lingkungan Production, Preview, dan Development sesuai kebutuhan. Nilainya harus berupa connection string MySQL/TiDB yang dapat dijangkau dari Vercel, misalnya `mysql://USER:PASSWORD@HOST:3306/wishlist_bersama`. Kemudian jalankan migrasi `drizzle/0001_careful_purifiers.sql` pada database tersebut satu kali. Tanpa database eksternal ini, antarmuka akan dapat dimuat tetapi wishlist tidak dapat disimpan.

Setelah perubahan ini tersedia di cabang `main`, Vercel akan memulai deployment baru secara otomatis. Untuk melakukan deployment ulang secara manual, pilih deployment terbaru kemudian klik **Redeploy** di dashboard Vercel.

## Alur Penggunaan

Pada beranda, isi nama wishlist kemudian pilih **“Buat & dapatkan tautan”**. Aplikasi akan membawa pembuat ke URL pengelolaan pribadi berbentuk `/manage/:slug?key=:ownerToken`. Simpan URL ini; tanpa akun, aplikasi tidak memiliki cara untuk memulihkan akses pengelolaan apabila URL hilang.

Di halaman pengelolaan, tambahkan item dengan detail yang diperlukan. Gunakan tombol **“Salin”** untuk memperoleh URL bersama berbentuk `/w/:slug`, kemudian kirimkan kepada penerima. Penerima dapat memilih status pada setiap kartu dan memilih **“Tambahkan catatan”** untuk meninggalkan konteks bagi pemilik. Pemilik akan melihat jumlah dan isi catatan pada ruang pengelolaannya.

## Model Akses Berbasis Tautan

| Tautan | Hak akses | Data rahasia |
|---|---|---|
| `/w/:slug` | Melihat wishlist, memperbarui status item, dan menambahkan catatan. | Hanya slug acak. |
| `/manage/:slug?key=:ownerToken` | Seluruh hak akses tautan bersama, ditambah tambah, edit, dan hapus item. | Slug acak dan token pemilik panjang. |

Desain ini menghilangkan langkah registrasi, tetapi bukan pengganti kontrol akses tingkat akun. Untuk lingkungan dengan kebutuhan privasi yang lebih ketat, pertimbangkan menambahkan rotasi tautan, kata sandi link, batas waktu akses, atau sistem autentikasi.

## Skema Data

Tabel `wishlists` menyimpan identitas, slug berbagi, serta token pemilik. Tabel `wishlistItems` menyimpan semua item yang terkait pada wishlist beserta status dan metadata opsional. Tabel `itemNotes` menyimpan pesan kolaborator untuk item tertentu. Kedua relasi anak menggunakan penghapusan berantai sehingga catatan tidak tertinggal ketika item dihapus.

## Struktur Penting

```text
client/src/pages/Home.tsx            # Pembuatan wishlist tanpa akun
client/src/pages/ManageWishlist.tsx  # Ruang pengelolaan pemilik
client/src/pages/ShareWishlist.tsx   # Tampilan dan kolaborasi penerima
client/src/components/WishlistItemForm.tsx
server/routers.ts                    # Kontrak tRPC publik
server/db.ts                         # Query Drizzle
drizzle/schema.ts                    # Definisi skema database
server/wishlist.router.test.ts       # Pengujian aturan API dan akses
```

## Catatan Keamanan Operasional

Token pemilik dan slug dibuat dengan Nano ID serta hanya disimpan di database dan URL akses. Jangan meletakkan URL pengelolaan pada situs publik, tangkapan layar, atau kanal yang tidak terpercaya. Semua mutasi pemilik memvalidasi pasangan `slug` dan `ownerToken`; mutasi kolaborator memastikan item memang bagian dari wishlist yang dituju.
