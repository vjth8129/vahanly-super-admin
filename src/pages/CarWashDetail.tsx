import { useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { carWashesApi, errorMessage, usersApi, type CarWash, type Status } from '../api'
import { CarWashProfileFields } from '../components/CarWashProfileFields'
import { EMPTY_PROFILE, toProfileBody, type ProfileForm } from '../lib/carWashProfile'
import { Icon, type IconName } from '../components/Icon'
import { toast } from '../components/Toast'
import { AddUserModal, UserTable } from '../components/UserTable'
import { Button, Card, ErrorBanner, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { formatDate, formatPhone } from '../lib/format'
import { useAsync } from '../lib/useAsync'

export function CarWashDetailPage() {
  const { id = '' } = useParams()
  const carWash = useAsync(() => carWashesApi.get(id), [id])
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'profile' ? 'profile' : 'team'

  const back = (
    <Link to="/car-washes" className="back-link">
      <Icon name="arrowLeft" size={16} /> Car washes
    </Link>
  )
  if (carWash.error) {
    return (
      <>
        <PageHeader back={back} title="Car wash" />
        <ErrorBanner message={carWash.error} onRetry={carWash.reload} />
      </>
    )
  }
  if (!carWash.data) return <Spinner />
  const cw = carWash.data

  return (
    <>
      <PageHeader
        back={back}
        title={
          <span className="title-with-badge">
            {cw.name} <StatusBadge status={cw.status} />
          </span>
        }
        subtitle={
          <span className="mono">
            {cw.code}
            <span className="muted"> · onboarded {formatDate(cw.createdAt)}</span>
          </span>
        }
        actions={<StatusActions carWash={cw} onChanged={(updated) => carWash.setData(updated)} />}
      />

      {cw.status !== 'ACTIVE' && (
        <div className={`notice notice-${cw.status.toLowerCase()}`}>
          <Icon name={cw.status === 'SUSPENDED' ? 'pause' : 'power'} />
          <span>
            {cw.status === 'SUSPENDED'
              ? 'Suspended — nobody at this car wash can sign in or use the app until it is reactivated. Their data is kept.'
              : 'Inactive — this car wash is switched off and its users can’t sign in. Reactivate it to restore access.'}
          </span>
        </div>
      )}

      <div className="tabs" role="tablist">
        {(['team', 'profile'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`tab ${tab === t ? 'tab-on' : ''}`}
            onClick={() => setParams(t === 'team' ? {} : { tab: t }, { replace: true })}>
            {t === 'team' ? 'Team' : 'Profile'}
          </button>
        ))}
      </div>

      {tab === 'team' ? <TeamTab carWash={cw} /> : <ProfileTab carWash={cw} onSaved={(updated) => carWash.setData(updated)} />}
    </>
  )
}

function TeamTab({ carWash }: { carWash: CarWash }) {
  const users = useAsync(() => usersApi.list({ carWashId: carWash.id, limit: 100 }).then((r) => r.items), [carWash.id])
  const [adding, setAdding] = useState(false)
  return (
    <Card
      title="Team"
      actions={
        <Button icon="plus" variant="secondary" onClick={() => setAdding(true)}>
          Add user
        </Button>
      }>
      <UserTable
        users={users.data ?? []}
        carWashId={carWash.id}
        loading={!users.data && !users.error}
        error={users.error}
        onRetry={users.reload}
        onChanged={users.reload}
        emptyText="No users in this car wash yet"
      />
      {adding && <AddUserModal carWashId={carWash.id} onClose={() => setAdding(false)} onCreated={users.reload} />}
    </Card>
  )
}

function toForm(cw: CarWash): ProfileForm {
  const form = { ...EMPTY_PROFILE }
  for (const k of Object.keys(form) as (keyof ProfileForm)[]) form[k] = (cw[k] as string | null) ?? ''
  return form
}

function ProfileTab({ carWash, onSaved }: { carWash: CarWash; onSaved: (cw: CarWash) => void }) {
  const [form, setForm] = useState(() => toForm(carWash))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(carWash))

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const updated = await carWashesApi.update(carWash.id, toProfileBody(form))
      onSaved(updated)
      setForm(toForm(updated))
      toast.success('Car wash profile saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save}>
      <Card title="Profile">
        {error && <div className="error-banner">{error}</div>}
        <CarWashProfileFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
        {carWash.phone && <p className="muted small">Shown to staff as {formatPhone(carWash.phone)}.</p>}
        <div className="form-actions">
          <Button variant="secondary" disabled={!dirty || busy} onClick={() => setForm(toForm(carWash))}>
            Discard changes
          </Button>
          <Button type="submit" icon="check" loading={busy} disabled={!dirty}>
            Save profile
          </Button>
        </div>
      </Card>
    </form>
  )
}

const STATUS_CHANGES: Record<Status, { label: string; icon: IconName; variant: 'primary' | 'secondary' | 'danger'; explain: string }> = {
  ACTIVE: {
    label: 'Activate',
    icon: 'play',
    variant: 'primary',
    explain: 'Everyone at this car wash will be able to sign in and use the app again.',
  },
  SUSPENDED: {
    label: 'Suspend',
    icon: 'pause',
    variant: 'secondary',
    explain:
      'Everyone at this car wash is signed out and can’t sign in until you reactivate it. Use this for a temporary hold (e.g. unpaid subscription). All data is kept.',
  },
  INACTIVE: {
    label: 'Deactivate',
    icon: 'power',
    variant: 'danger',
    explain: 'Switches the car wash off (e.g. it has closed). Its users can’t sign in. Data is kept and you can reactivate it later.',
  },
}

function StatusActions({ carWash, onChanged }: { carWash: CarWash; onChanged: (cw: CarWash) => void }) {
  const [target, setTarget] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!target) return
    setBusy(true)
    try {
      const updated = await carWashesApi.setStatus(carWash.id, target)
      onChanged(updated)
      toast.success(`${carWash.name} is now ${target.toLowerCase()}.`)
      setTarget(null)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const options = (Object.keys(STATUS_CHANGES) as Status[]).filter((s) => s !== carWash.status)
  return (
    <>
      {options.map((s) => (
        <Button key={s} variant={STATUS_CHANGES[s].variant} icon={STATUS_CHANGES[s].icon} onClick={() => setTarget(s)}>
          {STATUS_CHANGES[s].label}
        </Button>
      ))}
      {target && (
        <Modal
          title={`${STATUS_CHANGES[target].label} ${carWash.name}?`}
          onClose={() => setTarget(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button variant={target === 'ACTIVE' ? 'primary' : 'danger'} icon={STATUS_CHANGES[target].icon} loading={busy} onClick={confirm}>
                {STATUS_CHANGES[target].label}
              </Button>
            </>
          }>
          <p>{STATUS_CHANGES[target].explain}</p>
        </Modal>
      )}
    </>
  )
}
