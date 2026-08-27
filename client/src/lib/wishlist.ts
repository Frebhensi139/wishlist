export const statusOptions = [
  { value: "wanted", label: "Diinginkan", className: "bg-amber-100 text-amber-800 ring-amber-200" },
  { value: "planned", label: "Direncanakan", className: "bg-sky-100 text-sky-800 ring-sky-200" },
  { value: "purchased", label: "Sudah dibeli", className: "bg-violet-100 text-violet-800 ring-violet-200" },
  { value: "completed", label: "Selesai", className: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
] as const;

export type ItemStatus = (typeof statusOptions)[number]["value"];

export type WishlistItem = {
  id: number;
  title: string;
  description: string | null;
  priceCents: number | null;
  externalUrl: string | null;
  status: ItemStatus;
  notes: Array<{
    id: number;
    authorName: string | null;
    content: string;
    createdAt: Date;
  }>;
};

export function statusMeta(status: ItemStatus) {
  return statusOptions.find(option => option.value === status) ?? statusOptions[0];
}

export function formatPrice(priceCents: number | null) {
  if (priceCents === null) return null;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(priceCents / 100);
}

export function toCents(price: string) {
  const normalized = price.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}
