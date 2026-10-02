import { Link, useNavigate } from 'react-router-dom'

import { carWashesApi } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Icon, type IconName } from '../components/Icon'
import { Button, Card, EmptyState, ErrorBanner, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatDate } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const stats = useAsync(() => carWashesApi.stats(), [])
  const recent = useAsync(() => carWashesApi.list({ limit: 6 }).then((r) => r.items), [])

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${user?.name ?? 'platform admin'}. Here’s how the platform is doing.`}
        actions={
          <Button icon="plus" onClick={() => navigate('/car-washes/new')}>
            Onboard car wash
          </Button>
        }
      />

      {stats.error ? (
        <ErrorBanner message={stats.error} onRetry={stats.reload} />
      ) : !stats.data ? (
        <Spinner />
      ) : (
        <div className="stats">
          <Stat icon="building" label="Car washes" value={stats.data.carWashes.total} to="/car-washes" />
          <Stat icon="play" label="Active" value={stats.data.carWashes.active} tone="success" to="/car-washes?status=ACTIVE" />
          <Stat icon="pause" label="Suspended" value={stats.data.carWashes.suspended} tone="warning" to="/car-washes?status=SUSPENDED" />
          <Stat icon="power" label="Inactive" value={stats.data.carWashes.inactive} tone="muted" to="/car-washes?status=INACTIVE" />
          <Stat icon="users" label="Car wash users" value={stats.data.users.total} detail={`${stats.data.users.active} active`} to="/users" />
          <Stat icon="receipt" label="Orders today" value={stats.data.orders.today} detail={`${stats.data.orders.last30Days} in the last 30 days`} />
        </div>
      )}

      <Card title="Recently onboarded" actions={<Link to="/car-washes" className="link">View all</Link>}>
        {recent.error ? (
          <ErrorBanner message={recent.error} onRetry={recent.reload} />
        ) : !recent.data ? (
          <Spinner />
        ) : recent.data.length === 0 ? (
          <EmptyState icon="building" title="No car washes yet">
            <p className="muted">Onboard the first one to get started.</p>
          </EmptyState>
        ) : (
          <ul className="list">
            {recent.data.map((cw) => (
              <li key={cw.id}>
                <Link to={`/car-washes/${cw.id}`} className="list-row">
                  <span className="list-icon">
                    <Icon name="building" />
                  </span>
                  <span className="list-main">
                    <strong>{cw.name}</strong>
                    <span className="muted">
                      {cw.code}
                      {cw.city ? ` · ${cw.city}` : ''} · {cw.userCount ?? 0} users · since {formatDate(cw.createdAt)}
                    </span>
                  </span>
                  <StatusBadge status={cw.status} />
                  <Icon name="chevronRight" className="muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}

function Stat(props: { icon: IconName; label: string; value: number; detail?: string; tone?: 'success' | 'warning' | 'muted'; to?: string }) {
  const body = (
    <>
      <span className={`stat-icon tone-${props.tone ?? 'primary'}`}>
        <Icon name={props.icon} />
      </span>
      <span className="stat-value">{props.value.toLocaleString()}</span>
      <span className="stat-label">{props.label}</span>
      {props.detail && <span className="stat-detail">{props.detail}</span>}
    </>
  )
  return props.to ? (
    <Link to={props.to} className="stat">
      {body}
    </Link>
  ) : (
    <div className="stat">{body}</div>
  )
}
