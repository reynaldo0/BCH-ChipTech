"use client"

import React, { useState } from "react"
import { BrandMark } from "@/components/BrandMark"
import { Button } from "@/components/ui/button"
import { API_BASE, setSessionToken } from "@/lib/api"

export default function MasukPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(typeof body?.detail === "string" ? body.detail : "Login gagal. Periksa username dan kata sandi.")
        return
      }
      setSessionToken(body.token)
      window.localStorage.setItem("kompas_role", body.user.role)
      window.location.assign("/")
    } catch {
      setError("Server KOMPAS tidak dapat dihubungi.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6" aria-labelledby="login-title">
        <BrandMark variant="dark" />
        <div>
          <h1 id="login-title" className="font-display text-xl font-semibold text-ink-950">Masuk ke KOMPAS</h1>
          <p className="mt-1 text-[13px] text-ink-600">Gunakan akun yang diberikan pemilik toko.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="login-user">Username</label>
          <input id="login-user" className="field-control" autoComplete="username" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="login-pass">Kata sandi</label>
          <input id="login-pass" type="password" className="field-control" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error ? <p role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-[13px] text-danger-900">{error}</p> : null}
        <Button type="submit" className="w-full" loading={loading}>Masuk</Button>
      </form>
    </main>
  )
}
