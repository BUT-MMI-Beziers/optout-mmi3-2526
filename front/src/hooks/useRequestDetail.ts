import { useState, useEffect } from 'react'
import { getRequest, getRequestEvents, getTemplate } from '@/lib/api'
import { type RemovalRequest, type RequestEvent, type EmailTemplate } from '@/lib/mock-data'

export function useRequestDetail(id: string) {
  const [request, setRequest] = useState<RemovalRequest | null>(null)
  const [events, setEvents] = useState<RequestEvent[]>([])
  const [template, setTemplate] = useState<EmailTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getRequest(id)
      .then((req) => {
        setRequest(req)
        return Promise.all([
          getRequestEvents(id),
          req ? getTemplate(req.templateId) : Promise.resolve(null),
        ])
      })
      .then(([evts, tpl]) => {
        setEvents(evts)
        setTemplate(tpl)
      })
      .catch(() => setError('Impossible de charger la demande.'))
      .finally(() => setLoading(false))
  }, [id])

  return { request, events, template, loading, error }
}
