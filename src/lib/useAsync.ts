import { useCallback, useEffect, useRef, useState } from 'react'

import { errorMessage } from '../api'

/** Runs `fn` on mount and whenever `deps` change; stale responses are ignored. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const run = useRef(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps)

  const reload = useCallback(() => {
    const id = ++run.current
    setLoading(true)
    setError(null)
    load()
      .then((d) => id === run.current && setData(d))
      .catch((e) => id === run.current && setError(errorMessage(e)))
      .finally(() => id === run.current && setLoading(false))
  }, [load])

  useEffect(reload, [reload])

  return { data, setData, error, loading, reload }
}

/** Debounces a fast-changing value such as a search box. */
export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}
