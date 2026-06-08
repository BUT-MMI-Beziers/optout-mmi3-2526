import { useState, useEffect, useCallback } from "react"
import { getBrokers, type PaginatedBrokers, type BrokersParams } from "@/lib/api"

export function useBrokers(params: BrokersParams) {
  const [data, setData] = useState<PaginatedBrokers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getBrokers(params)
      setData(result)
    } catch {
      setError("Impossible de charger les brokers.")
    } finally {
      setLoading(false)
    }
  }, [params.page, params.perPage, params.category, params.region, params.difficulty, params.search])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}
