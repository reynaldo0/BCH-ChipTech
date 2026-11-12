import { AppShell } from "@/components/AppShell"
import { HomeDashboard } from "@/components/views/HomeDashboard"

export default function HomePage() {
  return (
    <AppShell title="Beranda" description="Lihat kondisi toko dan tentukan pekerjaan yang paling berdampak.">
      <HomeDashboard />
    </AppShell>
  )
}
