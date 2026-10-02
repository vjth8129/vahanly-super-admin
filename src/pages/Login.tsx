import { useState, type FormEvent } from 'react'

import { errorMessage } from '../api'
import { useAuth } from '../auth/AuthContext'
import { Button, Field, PasswordField } from '../components/ui'

type Mode = 'phone' | 'username'

export function LoginPage() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState<Mode>('phone')
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(mode === 'phone' ? { phone: account.trim() } : { username: account.trim() }, password)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  const isPhone = mode === 'phone'
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width={72} height={72} className="auth-logo" />
        <h1>VandiWash Admin</h1>
        <p className="muted">Sign in to manage car washes on the platform.</p>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <Field
          key={mode}
          label={isPhone ? 'Mobile number' : 'Username'}
          value={account}
          onChange={(e) => setAccount(isPhone ? e.target.value.replace(/[^\d+\s-]/g, '') : e.target.value)}
          type={isPhone ? 'tel' : 'text'}
          inputMode={isPhone ? 'tel' : 'text'}
          autoComplete={isPhone ? 'tel' : 'username'}
          placeholder={isPhone ? 'e.g. 98765 43210' : 'e.g. superadmin'}
          autoFocus
          required
          labelAccessory={
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setAccount('')
                setMode(isPhone ? 'username' : 'phone')
              }}>
              {isPhone ? 'Use username' : 'Use mobile number'}
            </button>
          }
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button type="submit" loading={busy} className="btn-block">
          Sign in
        </Button>
      </form>
    </div>
  )
}
