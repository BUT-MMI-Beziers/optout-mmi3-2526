import { useState, useEffect } from 'react'
import { getRequest, getRequestEvents } from '@/lib/api'
import { type RemovalRequest, type RequestEvent } from '@/lib/mock-data'

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<RemovalRequest | null>(null)
  const [events, setEvents] = useState<RequestEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    Promise.all([getRequest(id), getRequestEvents(id)])
      .then(([req, evts]) => {
        setRequest(req)
        setEvents(evts)
      })
      .catch(() => setError('Impossible de charger la demande.'))
      .finally(() => setLoading(false))
  }, [id])

  return { request, events, loading, error }
}
