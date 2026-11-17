import { AppShell } from "@/components/AppShell"
import { WorkspaceCS } from "@/components/views/WorkspaceCS"

export default function AsistenPage() {
  return (
    <AppShell title="Workspace CS" description="Tempel pesan pembeli, dapatkan draf bersumber, dan kerjakan antrean dengan keyboard.">
      <WorkspaceCS />
    </AppShell>
  )
}
