import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { statusOptions, toCents, type ItemStatus, type WishlistItem } from "@/lib/wishlist";
import { Loader2, Plus } from "lucide-react";
import { FormEvent, useState } from "react";

type ItemPayload = {
  title: string;
  description?: string;
  priceCents: number | null;
  externalUrl?: string;
  status: ItemStatus;
};

type WishlistItemFormProps = {
  initialItem?: WishlistItem | null;
  submitLabel: string;
  submitting?: boolean;
  onCancel?: () => void;
  onSubmit: (payload: ItemPayload) => Promise<void>;
};

export default function WishlistItemForm({
  initialItem,
  submitLabel,
  submitting = false,
  onCancel,
  onSubmit,
}: WishlistItemFormProps) {
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [description, setDescription] = useState(initialItem?.description ?? "");
  const [price, setPrice] = useState(
    initialItem?.priceCents === null || initialItem?.priceCents === undefined
      ? ""
      : String(initialItem.priceCents / 100),
  );
  const [externalUrl, setExternalUrl] = useState(initialItem?.externalUrl ?? "");
  const [status, setStatus] = useState<ItemStatus>(initialItem?.status ?? "wanted");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      setError("Nama item wajib diisi.");
      return;
    }
    if (price.trim() && toCents(price) === null) {
      setError("Harga harus berupa angka positif.");
      return;
    }
    setError("");
    try {
      await onSubmit({
        title: title.trim(),
        description,
        priceCents: toCents(price),
        externalUrl,
        status,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Item belum dapat disimpan.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="item-title">Nama item</Label>
        <Input
          id="item-title"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Contoh: Kelas merangkai bunga"
          maxLength={180}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-description">Deskripsi <span className="font-normal text-muted-foreground">(opsional)</span></Label>
        <Textarea
          id="item-description"
          value={description}
          onChange={event => setDescription(event.target.value)}
          placeholder="Detail kecil yang membantu mewujudkan keinginan ini."
          maxLength={2000}
          rows={3}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-price">Harga <span className="font-normal text-muted-foreground">(opsional)</span></Label>
          <Input
            id="item-price"
            value={price}
            onChange={event => setPrice(event.target.value)}
            placeholder="Contoh: 250000"
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-status">Status</Label>
          <select
            id="item-status"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={status}
            onChange={event => setStatus(event.target.value as ItemStatus)}
          >
            {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="item-url">Tautan referensi <span className="font-normal text-muted-foreground">(opsional)</span></Label>
        <Input
          id="item-url"
          type="url"
          value={externalUrl}
          onChange={event => setExternalUrl(event.target.value)}
          placeholder="https://..."
          maxLength={2048}
        />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>}
        <Button type="submit" disabled={submitting} className="gap-2 bg-primary px-5 text-primary-foreground hover:bg-primary/90">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
