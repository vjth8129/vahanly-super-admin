import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { errorMessage, rolesApi, usersApi, type Status, type User } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Icon, type IconName } from '../components/Icon'
import { toast } from '../components/Toast'
import { EditUserModal, ResetPasswordModal } from '../components/UserTable'
import { Button, Card, ErrorBanner, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatDate, formatDateTime, formatPhone, initials, roleLabel } from '../lib/format'
import { rolesFor } from '../lib/roles'
import { useAsync } from '../lib/useAsync'

const STATUS_ACTIONS: Record<Status, { label: string; icon: IconName; variant: 'primary' | 'secondary' | 'danger'; explain: string }> = {
  ACTIVE: { label: 'Activate', icon: 'play', variant: 'primary', explain: 'They’ll be able to sign in to the app again.' },
  SUSPENDED: {
    label: 'Suspend',
    icon: 'pause',
    variant: 'secondary',
    explain: 'They’re signed out everywhere and can’t sign in until you activate them again. Use this for a temporary block.',
  },
  INACTIVE: {
    label: 'Deactivate',
    icon: 'power',
    variant: 'secondary',
    explain: 'For someone who has left: they’re signed out and can’t sign in. Their account and history are kept, and you can activate it again.',
  },
}

export function UserDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const user = useAsync(() => usersApi.get(id), [id])
  const roles = useAsync(() => rolesApi.list().then((r) => r.items), [])
  const [modal, setModal] = useState<'edit' | 'reset' | 'delete' | Status | null>(null)
  const [busy, setBusy] = useState(false)

  const back = (u?: User | null) =>
    u?.carWash ? (
      <Link to={`/car-washes/${u.carWash.id}`} className="back-link">
        <Icon name="arrowLeft" size={16} /> {u.carWash.name}
      </Link>
    ) : (
      <Link to="/users" className="back-link">
        <Icon name="arrowLeft" size={16} /> Users
      </Link>
    )

  if (user.error) {
    return (
      <>
        <PageHeader back={back()} title="User" />
        <ErrorBanner message={user.error} onRetry={user.reload} />
      </>
    )
  }
  if (!user.data) return <Spinner />
  const u = user.data
  const isSelf = u.id === me?.id
  const isPlatform = u.carWashId === null

  const changeStatus = async (status: Status) => {
    setBusy(true)
    try {
      user.setData(await usersApi.setStatus(u.id, status))
      toast.success(`${u.name} is now ${status.toLowerCase()}.`)
      setModal(null)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await usersApi.remove(u.id)
      toast.success(`${u.name} was deleted.`)
      navigate(u.carWash ? `/car-washes/${u.carWash.id}` : '/users', { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }

  const statusOptions = (Object.keys(STATUS_ACTIONS) as Status[]).filter((s) => s !== u.status)

  return (
    <>
      <PageHeader
        back={back(u)}
        title={
          <span className="title-with-badge">
            <span className="avatar">{initials(u.name)}</span>
            {u.name} <StatusBadge status={u.status} />
          </span>
        }
        subtitle={
          <>
            {roleLabel(u.role?.name)}
            {u.carWash ? (
              <>
                {' at '}
                <Link to={`/car-washes/${u.carWash.id}`} className="link">
                  {u.carWash.name}
                </Link>
              </>
            ) : (
              ' · Platform'
            )}
          </>
        }
        actions={
          <>
            <Button variant="secondary" icon="edit" onClick={() => setModal('edit')}>
              Edit
            </Button>
            <Button variant="secondary" icon="key" onClick={() => setModal('reset')}>
              Reset password
            </Button>
          </>
        }
      />

      {u.status !== 'ACTIVE' && (
        <div className={`notice notice-${u.status.toLowerCase()}`}>
          <Icon name={u.status === 'SUSPENDED' ? 'pause' : 'power'} />
          <span>{u.status === 'SUSPENDED' ? 'Suspended — can’t sign in until activated.' : 'Inactive — can’t sign in. Activate the account to restore access.'}</span>
        </div>
      )}

      <div className="grid-profile">
        <Card title="Account">
          <dl className="kv">
            <dt>Mobile number</dt>
            <dd>{formatPhone(u.phone)}</dd>
            <dt>Username</dt>
            <dd className="mono">{u.username}</dd>
            <dt>Email</dt>
            <dd>{u.email ?? '—'}</dd>
            <dt>Role</dt>
            <dd>{roleLabel(u.role?.name)}</dd>
            <dt>Car wash</dt>
            <dd>{u.carWash ? <Link to={`/car-washes/${u.carWash.id}`} className="link">{u.carWash.name}</Link> : 'Platform (all car washes)'}</dd>
          </dl>
        </Card>
        <Card title="Sign-in">
          <dl className="kv">
            <dt>Signs in with</dt>
            <dd>{u.phone ? `Mobile number ${formatPhone(u.phone)}` : `Username ${u.username}`}</dd>
            <dt>Password</dt>
            <dd>{u.mustChangePassword ? 'Temporary — they’ll choose their own at next sign-in' : 'Set by them'}</dd>
            <dt>Last sign-in</dt>
            <dd>{formatDateTime(u.lastLoginAt)}</dd>
            <dt>Account created</dt>
            <dd>{formatDate(u.createdAt)}</dd>
          </dl>
        </Card>
      </div>

      {!isSelf && (
        <Card title="Access" className="danger-zone">
          <div className="danger-row">
            <div>
              <strong>Account status</strong>
              <p className="muted">Suspend or deactivate to stop them signing in. Their history is kept.</p>
            </div>
            <div className="page-actions">
              {statusOptions.map((s) => (
                <Button key={s} variant={STATUS_ACTIONS[s].variant} icon={STATUS_ACTIONS[s].icon} onClick={() => setModal(s)}>
                  {STATUS_ACTIONS[s].label}
                </Button>
              ))}
            </div>
          </div>
          <hr className="divider" />
          <div className="danger-row">
            <div>
              <strong>Delete user</strong>
              <p className="muted">Removes them from the car wash for good. Past jobs they handled are kept.</p>
            </div>
            <Button variant="danger" icon="x" onClick={() => setModal('delete')}>
              Delete user
            </Button>
          </div>
        </Card>
      )}

      {modal === 'edit' && (
        <EditUserModal
          user={u}
          roles={rolesFor(roles.data ?? [], u.carWashId)}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            user.reload()
          }}
        />
      )}
      {modal === 'reset' && <ResetPasswordModal user={u} onClose={() => setModal(null)} onDone={user.reload} />}
      {modal && modal in STATUS_ACTIONS && (
        <Modal
          title={`${STATUS_ACTIONS[modal as Status].label} ${u.name}?`}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                variant={modal === 'ACTIVE' ? 'primary' : 'danger'}
                icon={STATUS_ACTIONS[modal as Status].icon}
                loading={busy}
                onClick={() => changeStatus(modal as Status)}>
                {STATUS_ACTIONS[modal as Status].label}
              </Button>
            </>
          }>
          <p>{STATUS_ACTIONS[modal as Status].explain}</p>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal
          title={`Delete ${u.name}?`}
          onClose={() => setModal(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button variant="danger" icon="x" loading={busy} onClick={remove}>
                Delete user
              </Button>
            </>
          }>
          <p>
            {u.name} loses access immediately and disappears from the team lists. {isPlatform ? '' : 'Their mobile number becomes free to use for a new account. '}
            If they might come back, deactivate them instead.
          </p>
        </Modal>
      )}
    </>
  )
}
