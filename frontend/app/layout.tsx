import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "KOMPAS | Connected Operations & Margin Intelligence",
  description:
    "Sistem kecerdasan operasional dan margin deterministik untuk Toko Husin. Data simulasi.",
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
