import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "KOMPAS | Toko Husin",
  description:
    "Ringkasan usaha marketplace Toko Husin.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-canvas text-ink-900 antialiased">
        {children}
      </body>
    </html>
  )
}
