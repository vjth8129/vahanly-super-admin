import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { STATUSES, usersApi, type Status } from '../api'
import { Icon } from '../components/Icon'
import { UserTable } from '../components/UserTable'
import { PageHeader } from '../components/ui'
import { STATUS_LABEL } from '../lib/format'
import { useAsync, useDebounced } from '../lib/useAsync'
import { Pager } from './CarWashes'

const PAGE_SIZE = 25

export function UsersPage() {
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') as Status | null) ?? undefined
  const page = Number(params.get('page') ?? 1)
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim())
  const result = useAsync(() => usersApi.list({ page, limit: PAGE_SIZE, search: q, status }), [page, q, status])

  const setStatus = (s?: Status) => setParams(s ? { status: s } : {}, { replace: true })

  return (
    <>
      <PageHeader title="Users" subtitle="Everyone with an account, across all car washes. To add someone, open their car wash." />
      <div className="toolbar">
        <div className="search">
          <Icon name="search" />
          <input
            type="search"
            placeholder="Search name, mobile, username or email"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (page !== 1) setParams(status ? { status } : {}, { replace: true })
            }}
            aria-label="Search users"
          />
        </div>
        <div className="chips" role="group" aria-label="Filter by status">
          <button type="button" className={`chip ${!status ? 'chip-on' : ''}`} onClick={() => setStatus()}>
            All
          </button>
          {STATUSES.map((s) => (
            <button key={s} type="button" className={`chip ${status === s ? 'chip-on' : ''}`} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
      <UserTable
        users={result.data?.items ?? []}
        loading={!result.data && !result.error}
        error={result.error}
        onRetry={result.reload}
        onChanged={result.reload}
        emptyText={q || status ? 'No users match' : 'No users yet'}
      />
      {result.data && (
        <Pager
          page={page}
          totalPages={result.data.pagination.totalPages}
          total={result.data.pagination.total}
          onPage={(p) => setParams({ ...(status ? { status } : {}), page: String(p) })}
        />
      )}
    </>
  )
}
