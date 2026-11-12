import { AppShell } from "@/components/AppShell"
import { EvaluationView } from "@/components/views/EvaluationView"

export default function DemoEvidencePage() {
  return <AppShell title="Bukti akurasi" description="Hasil pengujian dataset demo untuk bahan presentasi juri."><EvaluationView /></AppShell>
}
