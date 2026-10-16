import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { CAR_WASH_STATUSES, carWashesApi, type CarWashStatus } from '../api'
import { Icon } from '../components/Icon'
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatDate, formatPhone, STATUS_LABEL } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'

const PAGE_SIZE = 20

export function CarWashesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as CarWashStatus | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState(params.get('q') ?? '')
  const q = useDebounced(search.trim())

  const result = useAsync(() => carWashesApi.list({ page, limit: PAGE_SIZE, search: q, status }), [page, q, status])

  const setFilter = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) p.set(k, v)
      else p.delete(k)
    }
    p.delete('page')
    setParams(p, { replace: true })
  }

  return (
    <>
      <PageHeader
        title="Car washes"
        subtitle="Every car wash on the platform. Open one to edit its profile, manage its team or change its status."
        actions={
          <Button icon="plus" onClick={() => navigate('/car-washes/new')}>
            Onboard car wash
          </Button>
        }
      />

      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search name, code or city"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (page !== 1) setFilter({})
            }}
            aria-label="Search car washes"
          />
        </div>
        <div className="chips" role="group" aria-label="Filter by status">
          <button type="button" className={`chip ${!status ? 'chip-on' : ''}`} onClick={() => setFilter({ status: undefined })}>
            All
          </button>
          {CAR_WASH_STATUSES.map((s) => (
            <button key={s} type="button" className={`chip ${status === s ? 'chip-on' : ''}`} onClick={() => setFilter({ status: s })}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {result.error ? (
        <ErrorBanner message={result.error} onRetry={result.reload} />
      ) : !result.data ? (
        <Spinner />
      ) : result.data.items.length === 0 ? (
        <EmptyState icon="building" title={q || status ? 'No car washes match' : 'No car washes yet'}>
          {!q && !status && (
            <Button icon="plus" onClick={() => navigate('/car-washes/new')}>
              Onboard the first car wash
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Car wash</th>
                  <th>Location</th>
                  <th>Contact</th>
                  <th className="num">Users</th>
                  <th>Status</th>
                  <th>Onboarded</th>
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((cw) => (
                  <tr key={cw.id} className="clickable" onClick={() => navigate(`/car-washes/${cw.id}`)}>
                    <td>
                      <strong>{cw.name}</strong>
                      <div className="muted mono">
                        {cw.code} {cw.source === 'SELF_SIGNUP' && <span className="tag">Self sign-up</span>}
                      </div>
                    </td>
                    <td>{[cw.city, cw.state].filter(Boolean).join(', ') || '—'}</td>
                    <td>{cw.phone ? formatPhone(cw.phone) : cw.email ?? '—'}</td>
                    <td className="num">{cw.userCount ?? 0}</td>
                    <td>
                      <StatusBadge status={cw.status} />
                    </td>
                    <td>{formatDate(cw.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager
            page={page}
            totalPages={result.data.pagination.totalPages}
            total={result.data.pagination.total}
            onPage={(p) => {
              const next = new URLSearchParams(params)
              next.set('page', String(p))
              setParams(next)
            }}
          />
        </>
      )}
    </>
  )
}

export function Pager({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return <p className="muted pager-note">{total} total</p>
  return (
    <div className="pager">
      <span className="muted">
        Page {page} of {totalPages} · {total} total
      </span>
      <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Previous
      </Button>
      <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  )
}
