import { AppShell } from "@/components/AppShell"
import { ProductBrainView } from "@/components/views/ProductBrainView"

export default function ProdukPage() {
  return <AppShell title="Produk & Stok" description="Perbarui stok dan lihat informasi produk yang dipakai untuk keputusan toko."><ProductBrainView /></AppShell>
}
