import { AppShell } from "@/components/AppShell"
import { SettingsView } from "@/components/views/SettingsView"

export default function PengaturanPage() {
  return <AppShell title="Pengaturan" description="Kelola aturan biaya dan lihat catatan perubahan data."><SettingsView /></AppShell>
}
