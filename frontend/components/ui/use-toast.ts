"use client"

import * as React from "react"

const TOAST_LIMIT = 4
const TOAST_REMOVE_DELAY = 5000

type ToastVariant = "default" | "success" | "destructive"

export type Toast = {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: ToastVariant
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "UPDATE"; toast: Partial<Toast> & Pick<Toast, "id"> }
  | { type: "DISMISS"; toastId?: string }
  | { type: "REMOVE"; toastId?: string }

type ToastState = { toasts: Toast[] }

const listeners: Array<(state: ToastState) => void> = []
let memoryState: ToastState = { toasts: [] }
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()

function dispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  if (action.type === "ADD") {
    return { toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT) }
  }
  if (action.type === "UPDATE") {
    return { toasts: state.toasts.map((toast) => (toast.id === action.toast.id ? { ...toast, ...action.toast } : toast)) }
  }
  if (action.type === "DISMISS") {
    return {
      toasts: state.toasts.map((toast) =>
        action.toastId && toast.id !== action.toastId ? toast : { ...toast, id: toast.id }
      ),
    }
  }
  if (action.type === "REMOVE") {
    return { toasts: action.toastId ? state.toasts.filter((toast) => toast.id !== action.toastId) : [] }
  }
  return state
}

function scheduleRemoval(id: string) {
  if (removalTimers.has(id)) return
  const timer = setTimeout(() => {
    removalTimers.delete(id)
    dispatch({ type: "REMOVE", toastId: id })
  }, TOAST_REMOVE_DELAY)
  removalTimers.set(id, timer)
}

function dismiss(id?: string) {
  dispatch({ type: "DISMISS", toastId: id })
  if (id) scheduleRemoval(id)
  else memoryState.toasts.forEach((toast) => scheduleRemoval(toast.id))
}

let count = 0
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return `toast-${count}`
}

export function toast({ ...props }: Omit<Toast, "id">) {
  const id = genId()
  dispatch({ type: "ADD", toast: { ...props, id } })
  scheduleRemoval(id)
  return {
    id,
    dismiss: () => dismiss(id),
    update: (next: Partial<Toast>) => dispatch({ type: "UPDATE", toast: { ...next, id } }),
  }
}

export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index >= 0) listeners.splice(index, 1)
    }
  }, [])

  return { ...state, toast, dismiss }
}
