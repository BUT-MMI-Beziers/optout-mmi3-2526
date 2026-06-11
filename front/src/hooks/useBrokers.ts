import { useState, useEffect, useCallback } from "react"
import { getBrokers, type PaginatedBrokers, type BrokersParams } from "@/lib/api"
import { useAutoRefresh } from "./useAutoRefresh"

export function useBrokers(params: BrokersParams) {
  const [data, setData] = useState<PaginatedBrokers | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await getBrokers(params)
      setData(result)
    } catch {
      setError("Impossible de charger les brokers.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [params.page, params.perPage, params.category, params.region, params.difficulty, params.search])

  useEffect(() => { load(false) }, [load])
  useAutoRefresh(() => load(true))

  const refetch = useCallback(() => load(false), [load])
  return { data, loading, error, refetch }
}
