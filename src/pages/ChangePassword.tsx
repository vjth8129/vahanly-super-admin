import { useState, type FormEvent } from 'react'

import { errorMessage } from '../api'
import { useAuth } from '../auth/AuthContext'
import { toast } from '../components/Toast'
import { Button, PasswordField } from '../components/ui'
import { isPasswordComplex, PASSWORD_RULES } from '../lib/password'

/** Change your own password. `forced` is the full-screen version shown when an admin set it. */
export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isPasswordComplex(next)) return setError(PASSWORD_RULES)
    if (next !== confirm) return setError('The two new passwords don’t match.')
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      toast.success('Password changed. Other sessions were signed out.')
      setCurrent('')
      setNext('')
      setConfirm('')
      onDone?.()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="stack">
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      <PasswordField label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      <PasswordField label="New password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" hint={PASSWORD_RULES} required />
      <PasswordField label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      <div>
        <Button type="submit" icon="check" loading={busy}>
          Save new password
        </Button>
      </div>
    </form>
  )
}

export function ChangePasswordPage({ forced }: { forced?: boolean }) {
  const { user, signOut } = useAuth()
  return (
    <div className="auth-page">
      <div className="auth-card auth-card-left">
        <h1>{forced ? 'Choose your own password' : 'Change password'}</h1>
        {forced && <p className="muted">Hi {user?.name} — your password was set by someone else. Pick a new one to continue.</p>}
        <ChangePasswordForm />
        <Button variant="ghost" icon="logout" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
