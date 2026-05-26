import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, Database, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { getBrokers, getRequests } from '@/lib/api'
import type { Broker, RemovalRequest } from '@/lib/mock-data'

export default function GlobalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [brokers, setBrokers] = useState<Broker[]>([])
  const [requests, setRequests] = useState<RemovalRequest[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) {
      setBrokers([])
      setRequests([])
      setLoading(false)
      return
    }
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const [b, r] = await Promise.all([
        getBrokers({ search: query, perPage: 4 }),
        getRequests({ search: query, perPage: 4 }),
      ])
      setBrokers(b.data)
      setRequests(r.data)
      setLoading(false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasResults = brokers.length > 0 || requests.length > 0
  const showDropdown = open && query.length >= 2

  const go = (path: string) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
      <Input
        placeholder="Rechercher un broker, une demande…"
        className="pl-9 bg-background h-9 text-sm pr-10"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded pointer-events-none">
        ⌘F
      </span>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover border border-border rounded-xl shadow-xl z-50 overflow-hidden min-w-[340px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : !hasResults ? (
            <p className="px-4 py-8 text-sm text-center text-muted-foreground">
              Aucun résultat pour « {query} »
            </p>
          ) : (
            <div className="py-1.5">
              {brokers.length > 0 && (
                <section>
                  <p className="px-3 pt-1 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Brokers
                  </p>
                  {brokers.map((b) => (
                    <button
                      key={b.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                      onMouseDown={() => go(`/brokers/${b.slug}`)}
                    >
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${b.website}&sz=32`}
                          alt={b.name}
                          className="w-4 h-4 object-contain"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).replaceWith(
                              Object.assign(document.createElement('span'), { innerHTML: '🔒' })
                            )
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.website}</p>
                      </div>
                      <Database className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </section>
              )}

              {requests.length > 0 && (
                <section>
                  {brokers.length > 0 && <div className="border-t border-border mx-3 my-1" />}
                  <p className="px-3 pt-1 pb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Demandes
                  </p>
                  {requests.map((r) => (
                    <button
                      key={r.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                      onMouseDown={() => go(`/requests/${r.id}`)}
                    >
                      <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.brokerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.brokerUrl}</p>
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
