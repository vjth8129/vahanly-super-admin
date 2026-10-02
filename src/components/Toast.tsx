import { useEffect, useState } from 'react'

type Toast = { id: number; kind: 'success' | 'error'; message: string }

let listeners: ((t: Toast[]) => void)[] = []
let toasts: Toast[] = []
let nextId = 1

function emit() {
  for (const l of listeners) l(toasts)
}

function push(kind: Toast['kind'], message: string) {
  const id = nextId++
  toasts = [...toasts, { id, kind, message }]
  emit()
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    emit()
  }, kind === 'error' ? 6000 : 3500)
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
}

export function ToastHost() {
  const [items, setItems] = useState<Toast[]>(toasts)
  useEffect(() => {
    listeners.push(setItems)
    return () => {
      listeners = listeners.filter((l) => l !== setItems)
    }
  }, [])
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
