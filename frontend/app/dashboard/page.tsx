import { AppShell } from "@/components/AppShell"
import { HomeDashboard } from "@/components/views/HomeDashboard"

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard" description="Lihat kondisi toko dan tentukan pekerjaan yang paling berdampak.">
      <HomeDashboard />
    </AppShell>
  )
}
