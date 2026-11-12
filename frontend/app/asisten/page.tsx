import { AppShell } from "@/components/AppShell"
import { ChatCopilotView } from "@/components/views/ChatCopilotView"

export default function AsistenPage() {
  return <AppShell title="Asisten" description="Buat draft jawaban pelanggan dari data produk dan aturan toko."><ChatCopilotView /></AppShell>
}
