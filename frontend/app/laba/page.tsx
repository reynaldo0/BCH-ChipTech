import { AppShell } from "@/components/AppShell"
import { ProfitEngineView } from "@/components/views/ProfitEngineView"

export default function LabaPage() {
  return <AppShell title="Laba Kontribusi" description="Unggah laporan marketplace, lihat laba per SKU, kanal, dan periode sampai ke baris transaksi."><ProfitEngineView /></AppShell>
}
