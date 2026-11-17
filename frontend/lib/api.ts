export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export type Role = "owner" | "manager" | "cs" | "packing" | "judge"

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

export function currentRole(): Role {
  if (typeof window === "undefined") return "owner"
  return (window.localStorage.getItem("kompas_role") as Role | null) ?? "owner"
}

let bootstrap: Promise<string | null> | null = null

/** Demo login: obtain a session token for the selected role once, so the API can enforce RBAC. */
async function ensureToken(): Promise<string | null> {
  const existing = authToken()
  if (existing || typeof window === "undefined") return existing
  if (!bootstrap) {
    bootstrap = fetch(`${API_BASE}/api/auth/switch-role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: currentRole() }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.token) window.localStorage.setItem("kompas_token", body.token)
        return body?.token ?? null
      })
      .catch(() => null)
      .finally(() => {
        bootstrap = null
      })
  }
  return bootstrap
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

  if (res.status === 401 && typeof window !== "undefined" && token) {
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
  else window.localStorage.removeItem("kompas_token")
}
