import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { errorMessage, rolesApi, STATUSES, usersApi, type Role, type Status, type User } from '../api'
import { formatDateTime, formatPhone, initials, roleLabel, STATUS_LABEL } from '../lib/format'
import { generateTempPassword, isPasswordComplex, PASSWORD_RULES } from '../lib/password'
import { rolesFor } from '../lib/roles'
import { useAsync } from '../lib/useAsync'
import { toast } from './Toast'
import { Button, CopyButton, EmptyState, ErrorBanner, Field, Modal, PasswordField, Select, Spinner, StatusBadge } from './ui'

type Props = {
  users: User[]
  /** Set when the table shows one car wash: hides the car wash column, enables "Add user". */
  carWashId?: string
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onChanged: () => void
  emptyText?: string
}

export function UserTable({ users, carWashId, loading, error, onRetry, onChanged, emptyText = 'No users found' }: Props) {
  const roles = useAsync(() => rolesApi.list().then((r) => r.items), [])
  const [editing, setEditing] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)

  if (error) return <ErrorBanner message={error} onRetry={onRetry} />
  if (loading) return <Spinner />
  if (users.length === 0) return <EmptyState icon="users" title={emptyText} />

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              {!carWashId && <th>Car wash</th>}
              <th>Role</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th className="actions-col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="person">
                    <span className="avatar avatar-sm">{initials(u.name)}</span>
                    <div>
                      <Link to={`/users/${u.id}`} className="person-link">
                        {u.name}
                      </Link>
                      <div className="muted">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="nowrap">{formatPhone(u.phone)}</td>
                {!carWashId && (
                  <td className="cell-wash">{u.carWash ? <Link to={`/car-washes/${u.carWash.id}`} className="link">{u.carWash.name}</Link> : <span className="muted">Platform</span>}</td>
                )}
                <td>{roleLabel(u.role?.name)}</td>
                <td>
                  <StatusBadge status={u.status} />
                  {u.mustChangePassword && <div className="muted small nowrap">Temporary password</div>}
                </td>
                <td className="nowrap">{formatDateTime(u.lastLoginAt)}</td>
                <td className="actions-col">
                  <div className="row-actions">
                    <Button variant="ghost" icon="edit" onClick={() => setEditing(u)}>
                      Edit
                    </Button>
                    <Button variant="ghost" icon="key" onClick={() => setResetting(u)}>
                      Reset password
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <EditUserModal
          user={editing}
          roles={rolesFor(roles.data ?? [], editing.carWashId)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            onChanged()
          }}
        />
      )}
      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} onDone={onChanged} />}
    </>
  )
}

export function EditUserModal({ user, roles, onClose, onSaved }: { user: User; roles: Role[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [email, setEmail] = useState(user.email ?? '')
  const [roleId, setRoleId] = useState(user.roleId)
  const [status, setStatus] = useState<Status>(user.status)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const isPlatform = user.carWashId === null

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (user.phone && phone.replace(/\D/g, '').length < 10) return setError('Mobile number is required — they sign in with it.')
    setBusy(true)
    setError(null)
    try {
      await usersApi.update(user.id, {
        name: name.trim(),
        email: email.trim() || null,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(roleId !== user.roleId ? { roleId } : {}),
      })
      if (status !== user.status) await usersApi.setStatus(user.id, status)
      toast.success(`${name.trim()} was updated.`)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Edit ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-user" icon="check" loading={busy}>
            Save
          </Button>
        </>
      }>
      <form id="edit-user" onSubmit={save} className="stack">
        {error && <div className="error-banner">{error}</div>}
        <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        <Field label="Mobile number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="They sign in with this number." />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {!isPlatform && (
          <Select label="Role" value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: roleLabel(r.name) }))} />
        )}
        <Select
          label="Account status"
          value={status}
          onChange={(v) => setStatus(v as Status)}
          options={STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          hint="Suspended or inactive users can’t sign in."
        />
      </form>
    </Modal>
  )
}

export function ResetPasswordModal({ user, onClose, onDone }: { user: User; onClose: () => void; onDone: () => void }) {
  const [password, setPassword] = useState(generateTempPassword)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isPasswordComplex(password)) return setError(PASSWORD_RULES)
    setBusy(true)
    setError(null)
    try {
      await usersApi.resetPassword(user.id, password)
      setDone(true)
      onDone()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={done ? 'Password reset' : `Reset ${user.name}’s password`}
      onClose={onClose}
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="reset-password" icon="key" loading={busy}>
              Reset password
            </Button>
          </>
        )
      }>
      {done ? (
        <div className="stack">
          <p>Share this temporary password with {user.name} privately. They’ll choose their own when they next sign in, and their other sessions were signed out.</p>
          <dl className="kv">
            <dt>Mobile number</dt>
            <dd>{formatPhone(user.phone)}</dd>
            <dt>Temporary password</dt>
            <dd className="mono">
              {password} <CopyButton text={password} label="Copy password" />
            </dd>
          </dl>
        </div>
      ) : (
        <form id="reset-password" onSubmit={submit} className="stack">
          {error && <div className="error-banner">{error}</div>}
          <p className="muted">They’ll be signed out everywhere and asked to choose their own password at next sign-in.</p>
          <PasswordField
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            labelAccessory={
              <button type="button" className="link-btn" onClick={() => setPassword(generateTempPassword())}>
                Generate new
              </button>
            }
            required
          />
        </form>
      )}
    </Modal>
  )
}

export function AddUserModal({ carWashId, onClose, onCreated }: { carWashId: string; onClose: () => void; onCreated: () => void }) {
  const roles = useAsync(() => rolesApi.list().then((r) => rolesFor(r.items, carWashId)), [carWashId])
  const [form, setForm] = useState({ name: '', phone: '', username: '', email: '', roleId: '', password: generateTempPassword() })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<User | null>(null)
  const roleId = form.roleId || roles.data?.find((r) => r.name === 'STAFF')?.id || ''

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Enter their mobile number — they sign in with it.')
    if (!isPasswordComplex(form.password)) return setError(`Temporary password: ${PASSWORD_RULES}`)
    setBusy(true)
    setError(null)
    try {
      const user = await usersApi.create({
        carWashId,
        name: form.name.trim(),
        phone: form.phone.trim(),
        username: form.username.trim(),
        email: form.email.trim() || undefined,
        roleId,
        password: form.password,
      })
      setCreated(user)
      onCreated()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (created) {
    return (
      <Modal title={`${created.name} was added`} onClose={onClose} footer={<Button onClick={onClose}>Done</Button>}>
        <p>Share these sign-in details privately. They’ll choose their own password on first sign-in.</p>
        <dl className="kv">
          <dt>Mobile number</dt>
          <dd>
            {formatPhone(created.phone)} <CopyButton text={created.phone ?? ''} label="Copy mobile number" />
          </dd>
          <dt>Temporary password</dt>
          <dd className="mono">
            {form.password} <CopyButton text={form.password} label="Copy password" />
          </dd>
        </dl>
      </Modal>
    )
  }

  return (
    <Modal
      title="Add a user"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="add-user" icon="plus" loading={busy} disabled={!roleId}>
            Add user
          </Button>
        </>
      }>
      <form id="add-user" onSubmit={submit} className="stack">
        {error && <div className="error-banner">{error}</div>}
        <Field label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        <Field
          label="Mobile number"
          type="tel"
          inputMode="tel"
          placeholder="e.g. 98765 43210"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+\s-]/g, '') })}
          hint="They sign in to the app with this number."
          required
        />
        <Field
          label="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value.replace(/\s/g, '') })}
          required
          minLength={3}
        />
        <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        {roles.data ? (
          <Select label="Role" value={roleId} onChange={(v) => setForm({ ...form, roleId: v })} options={roles.data.map((r) => ({ value: r.id, label: roleLabel(r.name) }))} required />
        ) : (
          <Spinner label="Loading roles…" />
        )}
        <PasswordField
          label="Temporary password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          labelAccessory={
            <button type="button" className="link-btn" onClick={() => setForm({ ...form, password: generateTempPassword() })}>
              Generate new
            </button>
          }
          required
        />
      </form>
    </Modal>
  )
}
