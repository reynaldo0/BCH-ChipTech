import type { Metadata } from "next"
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google"
import ".//globals.css"

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" })
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "KOMPAS | Toko Husin",
  description: "Ringkasan usaha marketplace Toko Husin.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
