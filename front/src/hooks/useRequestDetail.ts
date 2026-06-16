import { useState, useEffect, useCallback } from 'react'
import { getRequest, getRequestEvents, getTemplate } from '@/lib/api'
import { type RemovalRequest, type RequestEvent, type EmailTemplate } from '@/lib/mock-data'
import { useAutoRefresh } from './useAutoRefresh'

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<RemovalRequest | null>(null)
  const [events, setEvents] = useState<RequestEvent[]>([])
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent: boolean) => {
    if (!id) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const req = await getRequest(id)
      setRequest(req)
      const [evts, tpl] = await Promise.all([
        getRequestEvents(id),
        req ? getTemplate(req.templateId) : Promise.resolve(null),
      ])
      setEvents(evts)
      setTemplate(tpl)
    } catch {
      setError('Impossible de charger la demande.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [id])

  useEffect(() => { load(false) }, [load])
  useAutoRefresh(() => load(true))

  const refetch = useCallback(() => load(false), [load])
  return { request, events, template, loading, error, refetch }
}
