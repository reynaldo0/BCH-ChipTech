import { AppShell } from "@/components/AppShell"
import { ProfitEngineView } from "@/components/views/ProfitEngineView"

export default function LabaPage() {
  return <AppShell title="Pesanan & Laba" description="Periksa hasil penjualan, selisih biaya, dan dampak perubahan harga."><ProfitEngineView /></AppShell>
}
