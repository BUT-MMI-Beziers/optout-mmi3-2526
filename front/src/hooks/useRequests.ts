import { useState, useEffect, useCallback } from "react"
import { getRequests, type PaginatedRequests, type RequestsParams } from "@/lib/api"

export function useRequests(params: RequestsParams) {
  const [data, setData] = useState<PaginatedRequests | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getRequests(params)
      setData(result)
    } catch {
      setError("Impossible de charger les demandes.")
    } finally {
      setLoading(false)
    }
  }, [params.page, params.perPage, params.status, params.search])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
