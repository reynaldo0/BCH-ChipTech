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

async function parseError(res: Response): Promise<string> {
  try {
    const payload = await res.json()
    if (typeof payload?.detail === "string") return payload.detail
    if (payload?.detail) return JSON.stringify(payload.detail)
    if (typeof payload?.message === "string") return payload.message
  } catch {
    // Response was not JSON; fall through to a safe generic message.
  }
  return "Permintaan tidak dapat diproses. Periksa koneksi ke server KOMPAS."
}

export async function fetchApi<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = authToken()
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

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  get: <T = unknown>(path: string) => fetchApi<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown) =>
    fetchApi<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    fetchApi<T>(path, {
      method: "PATCH",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  upload: <T = unknown>(path: string, formData: FormData) =>
    fetchApi<T>(path, { method: "POST", body: formData }),
}

export function setSessionToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) window.localStorage.setItem("kompas_token", token)
  else window.localStorage.removeItem("kompas_token")
}
