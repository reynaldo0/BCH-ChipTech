import { AppShell } from "@/components/AppShell"
import { ComplaintsView } from "@/components/views/ComplaintsView"

export default function KeluhanPage() {
  return <AppShell title="Keluhan" description="Tindak lanjuti masalah pelanggan dan pisahkan biaya yang sudah terkonfirmasi."><ComplaintsView /></AppShell>
}
