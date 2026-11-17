"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowRight, Eye, EyeOff, Leaf, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { BrandMark } from "@/components/BrandMark"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE, DEMO_MODE, markAuthenticated, setSessionToken } from "@/lib/api"

type AuthMode = "login" | "register"

export function AuthPanel({ mode }: { mode: AuthMode }) {
  const [username, setUsername] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const isLogin = mode === "login"

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError("")
    setNotice("")

    if (!isLogin) {
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/auth/register-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_name: name.trim(), email: email.trim(), password, requested_role: "cs" }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          const message = typeof body?.detail === "string" ? body.detail : "Pengajuan akses gagal dikirim."
          setError(message)
          toast({ title: "Pengajuan gagal", description: message, variant: "destructive" })
          return
        }
        const message = body.message || "Pengajuan akses berhasil dikirim ke owner."
        setNotice(message)
        toast({ title: "Pengajuan terkirim", description: message, variant: "success" })
      } catch {
        const message = "Server KOMPAS tidak dapat dihubungi."
        setError(message)
        toast({ title: "Pengajuan gagal", description: message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = typeof body?.detail === "string" ? body.detail : "Login gagal. Periksa username dan kata sandi."
        setError(message)
        toast({ title: "Login gagal", description: message, variant: "destructive" })
        return
      }
      setSessionToken(body.token)
      markAuthenticated()
      window.localStorage.setItem("kompas_role", body.user.role)
      toast({ title: "Login berhasil", description: `Selamat datang, ${body.user.display_name}.`, variant: "success" })
      const next = new URLSearchParams(window.location.search).get("next")
      const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"
      window.location.assign(destination)
    } catch {
      const message = "Server KOMPAS tidak dapat dihubungi."
      setError(message)
      toast({ title: "Tidak dapat masuk", description: message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-background p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid h-full max-w-[1360px] overflow-hidden rounded-[24px] border border-line bg-card shadow-pop lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)]">
        <section className="relative hidden overflow-hidden bg-sidebar p-8 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="absolute -right-20 top-20 h-64 w-64 rounded-full border-[28px] border-sand-400/10" aria-hidden="true" />
          <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-brand-700/20" aria-hidden="true" />

          <div className="relative">
            <BrandMark variant="light" />
            <div className="mt-24 max-w-md">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-sand-400/30 bg-sand-400/10 px-3 py-1.5 text-xs font-semibold text-sand-200">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Connected Operations
              </p>
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white xl:text-5xl">
                Toko yang rapi,
                <span className="block text-sand-300">pelanggan yang kembali.</span>
              </h1>
              <p className="mt-6 max-w-sm text-sm leading-7 text-sidebar-foreground/75">
                Satu ruang kerja untuk menjaga layanan pelanggan, stok, dan laba toko kurma tetap terkendali.
              </p>
            </div>
          </div>

          <div className="relative grid max-w-lg grid-cols-2 gap-3">
            {[
              { icon: ShieldCheck, label: "Berbasis bukti", detail: "Setiap keputusan dapat ditelusuri" },
              { icon: Leaf, label: "Lebih tenang", detail: "Data penting mudah dipindai" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm">
                <item.icon className="h-5 w-5 text-sand-300" aria-hidden="true" />
                <p className="mt-8 text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-sidebar-foreground/65">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto bg-surface-muted px-5 py-8 sm:px-10 lg:flex lg:items-center lg:justify-center lg:px-14 lg:py-8 xl:px-20">
          <div className="w-full max-w-[430px]">
            <div className="flex items-center justify-between lg:hidden">
              <BrandMark variant="dark" />
            </div>

            <motion.div
              className="mt-10 rounded-2xl border border-line bg-card p-5 shadow-card sm:p-8 lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="grid grid-cols-2 rounded-xl border border-line bg-ink-50 p-1">
                <Link
                  href="/masuk"
                  className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                    isLogin ? "bg-card text-ink-950 shadow-xs" : "text-ink-500 hover:text-ink-900"
                  }`}
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold transition-colors ${
                    !isLogin ? "bg-card text-ink-950 shadow-xs" : "text-ink-500 hover:text-ink-900"
                  }`}
                >
                  Daftar akses
                </Link>
              </div>

              <div className="mt-8">
                <p className="eyebrow text-brand-700">{isLogin ? "Selamat datang kembali" : "Akses workspace"}</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em] text-ink-950">
                  {isLogin ? "Masuk ke KOMPAS" : "Mulai bekerja lebih rapi"}
                </h2>
                <p className="mt-3 text-sm leading-6 text-ink-600">
                  {isLogin
                    ? "Gunakan akun yang diberikan pemilik toko untuk melanjutkan."
                    : "KOMPAS memakai akses terkelola agar data operasional toko tetap aman."}
                </p>
              </div>

              <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
                {!isLogin ? (
                  <>
                    <div>
                      <label className="field-label" htmlFor="register-name">Nama lengkap</label>
                      <input id="register-name" className="field-control h-11" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="register-email">Email kerja</label>
                      <input id="register-email" type="email" className="field-control h-11" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="field-label" htmlFor="login-user">Username</label>
                      <input id="login-user" className="field-control h-11" autoComplete="username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} />
                    </div>
                  </>
                )}

                <div>
                  <label className="field-label" htmlFor="auth-password">Kata sandi</label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      className="field-control h-11 pr-11"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                      aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isLogin ? (
                  <div className="flex items-center justify-between gap-3 text-xs text-ink-600">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-input accent-brand-600" defaultChecked />
                      Ingat perangkat ini
                    </label>
                    <span className="font-medium text-ink-500">Akses dikelola owner</span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-sand-300 bg-sand-100/70 p-3 text-xs leading-5 text-ink-700">
                    Akun baru dibuat oleh pemilik toko. Kirim permintaan akses untuk mengetahui role yang sesuai.
                  </div>
                )}
                {isLogin && DEMO_MODE ? (
                  <p className="text-xs leading-5 text-ink-500">
                    Untuk pengujian demo, gunakan username sesuai role: owner, manager, cs, packing, atau judge.
                  </p>
                ) : null}

                {error ? (
                  <div role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-3.5 py-3 text-sm leading-5 text-danger-900">
                    {error}
                  </div>
                ) : null}
                {notice ? (
                  <div role="status" className="rounded-xl border border-success-border bg-success-bg px-3.5 py-3 text-sm leading-5 text-success-900">
                    {notice}
                  </div>
                ) : null}

                <Button type="submit" className="h-11 w-full rounded-xl" loading={loading}>
                  {isLogin ? "Masuk ke workspace" : "Minta akses dari owner"}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </form>

              <div className="mt-7 flex items-center justify-center gap-2 text-[11px] text-ink-500">
                <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
                Data toko terlindungi dengan akses berbasis peran
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </main>
  )
}
