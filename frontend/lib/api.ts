export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

/** Demo mode lets anyone pick a role; production (NEXT_PUBLIC_DEMO_MODE=false) requires login. */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false"
const AUTHENTICATED_MARKER = "kompas_authenticated"

export type Role = "owner" | "manager" | "cs" | "packing" | "judge"
export type SessionUser = { id: number; username: string; display_name: string; role: Role }

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

function authToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("kompas_token")
}

export function getSessionToken(): string | null {
  return authToken()
}

export function currentRole(): Role {
  if (typeof window === "undefined") return "owner"
  return (window.localStorage.getItem("kompas_role") as Role | null) ?? "owner"
}

export function hasAuthenticatedSession(): boolean {
  if (typeof window === "undefined") return false
  return Boolean(authToken() && window.localStorage.getItem(AUTHENTICATED_MARKER) === "1")
}

export function markAuthenticated() {
  if (typeof window !== "undefined") window.localStorage.setItem(AUTHENTICATED_MARKER, "1")
}

/** API calls never create a session implicitly; a user must log in first. */
async function ensureToken(): Promise<string | null> {
  const existing = authToken()
  return existing
}

async function parseError(res: Response): Promise<string> {
  try {
    const payload = await res.json()
    if (typeof payload?.detail === "string") return payload.detail
    if (typeof payload?.detail?.message === "string") return payload.detail.message
    if (Array.isArray(payload?.detail)) return payload.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ")
    if (payload?.detail) return JSON.stringify(payload.detail)
    if (typeof payload?.message === "string") return payload.message
  } catch {
    // Response was not JSON; fall through to a safe generic message.
  }
  return "Permintaan tidak dapat diproses. Periksa koneksi ke server KOMPAS."
}

export async function verifySession(): Promise<SessionUser> {
  const token = authToken()
  if (!token) throw new ApiError("Sesi tidak ditemukan.", 401)
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, "X-Requested-With": "XMLHttpRequest" },
    credentials: "include",
  })
  if (!res.ok) {
    setSessionToken(null)
    throw new ApiError(await parseError(res), res.status)
  }
  return (await res.json()) as SessionUser
}

export async function fetchApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await ensureToken()
  const headers = new Headers(options.headers)
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)
  headers.set("X-Requested-With", "XMLHttpRequest")

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (res.status === 401 && typeof window !== "undefined" && !DEMO_MODE) {
    window.localStorage.removeItem("kompas_token")
    if (!window.location.pathname.startsWith("/masuk")) window.location.assign("/masuk")
  } else if (res.status === 401 && typeof window !== "undefined" && token) {
    // Expired demo session: drop it and retry once with a fresh token.
    window.localStorage.removeItem("kompas_token")
    if (!(options.headers as Record<string, string> | undefined)?.["x-retried"]) {
      return fetchApi<T>(path, { ...options, headers: { ...(options.headers as Record<string, string>), "x-retried": "1" } })
    }
  }

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T = any>(path: string) => fetchApi<T>(path, { method: "GET" }),
  post: <T = any>(path: string, body?: unknown) =>
    fetchApi<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = any>(path: string, body?: unknown) =>
    fetchApi<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  upload: <T = any>(path: string, formData: FormData) =>
    fetchApi<T>(path, { method: "POST", body: formData }),
}

export function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem("kompas_token", token)
  else {
    window.localStorage.removeItem("kompas_token")
    window.localStorage.removeItem(AUTHENTICATED_MARKER)
  }
}
