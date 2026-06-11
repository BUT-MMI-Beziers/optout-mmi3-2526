import { useState, useEffect, useCallback } from "react"
import { getRequests, type PaginatedRequests, type RequestsParams } from "@/lib/api"
import { useAutoRefresh } from "./useAutoRefresh"

export function useRequests(params: RequestsParams) {
  const [data, setData] = useState<PaginatedRequests | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await getRequests(params)
      setData(result)
    } catch {
      setError("Impossible de charger les demandes.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [params.page, params.perPage, params.status, params.search])

  useEffect(() => { load(false) }, [load])
  useAutoRefresh(() => load(true))

  const refetch = useCallback(() => load(false), [load])
  return { data, loading, error, refetch }
}
