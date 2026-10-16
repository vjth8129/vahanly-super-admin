import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { carWashesApi, errorMessage, type OnboardedCarWash } from '../api'
import { CarWashProfileFields } from '../components/CarWashProfileFields'
import { EMPTY_PROFILE, profileError, suggestCode, toProfileBody, type ProfileForm } from '../lib/carWashProfile'
import { Icon } from '../components/Icon'
import { toast } from '../components/Toast'
import { Button, Card, CopyButton, Field, PageHeader, PasswordField } from '../components/ui'
import { formatPhone } from '../lib/format'
import { generateTempPassword, isPasswordComplex, PASSWORD_RULES } from '../lib/password'

export function OnboardPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<ProfileForm>(EMPTY_PROFILE)
  const [codeEdited, setCodeEdited] = useState(false)
  const [owner, setOwner] = useState({ name: '', phone: '', username: '', email: '', password: generateTempPassword() })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ carWash: OnboardedCarWash; password: string } | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = profileError(profile)
    if (problem) return setError(problem)
    if (owner.phone.replace(/\D/g, '').length < 10) return setError('Enter the owner’s mobile number — they sign in with it.')
    if (!isPasswordComplex(owner.password)) return setError(`Temporary password: ${PASSWORD_RULES}`)
    setBusy(true)
    setError(null)
    try {
      const body = toProfileBody(profile)
      const carWash = await carWashesApi.onboard({
        ...body,
        name: body.name!,
        code: body.code!,
        owner: {
          name: owner.name.trim(),
          phone: owner.phone.trim(),
          username: owner.username.trim(),
          password: owner.password,
          email: owner.email.trim() || undefined,
        },
      })
      setDone({ carWash, password: owner.password })
    } catch (err) {
      setError(errorMessage(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setBusy(false)
    }
  }

  if (done) return <OnboardingDone carWash={done.carWash} password={done.password} />

  return (
    <>
      <PageHeader
        back={
          <Link to="/car-washes" className="back-link">
            <Icon name="arrowLeft" size={16} /> Car washes
          </Link>
        }
        title="Onboard a car wash"
        subtitle="Creates the car wash and its owner account together. The owner signs in to the Vahanly app with their mobile number and adds their own staff."
      />
      <form onSubmit={submit} className="stack-lg">
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <Card title="Car wash">
          <CarWashProfileFields
            form={profile}
            onChange={(patch) => {
              if ('code' in patch) setCodeEdited(true)
              setProfile((p) => ({ ...p, ...patch }))
            }}
            onNameChange={(name) => setProfile((p) => ({ ...p, name, code: codeEdited ? p.code : suggestCode(name) }))}
          />
        </Card>

        <Card title="Owner account">
          <div className="grid-2">
            <Field label="Full name" value={owner.name} onChange={(e) => setOwner({ ...owner, name: e.target.value })} required minLength={2} />
            <Field
              label="Mobile number"
              type="tel"
              inputMode="tel"
              placeholder="e.g. 98765 43210"
              value={owner.phone}
              onChange={(e) => setOwner({ ...owner, phone: e.target.value.replace(/[^\d+\s-]/g, '') })}
              hint="They sign in with this number. Must not be used by any other account."
              required
            />
            <Field
              label="Username"
              value={owner.username}
              onChange={(e) => setOwner({ ...owner, username: e.target.value.replace(/\s/g, '') })}
              autoCapitalize="none"
              hint="Shown on their profile; also works for signing in."
              required
              minLength={3}
            />
            <Field label="Email" type="email" value={owner.email} onChange={(e) => setOwner({ ...owner, email: e.target.value })} hint="Optional. Used for password reset codes." />
            <PasswordField
              label="Temporary password"
              value={owner.password}
              onChange={(e) => setOwner({ ...owner, password: e.target.value })}
              hint="They’ll be asked to choose their own password on first sign-in."
              labelAccessory={
                <button type="button" className="link-btn" onClick={() => setOwner({ ...owner, password: generateTempPassword() })}>
                  Generate new
                </button>
              }
              required
            />
          </div>
        </Card>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/car-washes')}>
            Cancel
          </Button>
          <Button type="submit" icon="check" loading={busy}>
            Onboard car wash
          </Button>
        </div>
      </form>
    </>
  )
}

function OnboardingDone({ carWash, password }: { carWash: OnboardedCarWash; password: string }) {
  const navigate = useNavigate()
  const owner = carWash.owner!
  const shareText = `Vahanly app sign-in for ${carWash.name}\nMobile number: ${formatPhone(owner.phone)}\nTemporary password: ${password}\nYou'll be asked to choose your own password when you first sign in.`
  return (
    <>
      <PageHeader title={`${carWash.name} is ready`} subtitle="Share these sign-in details with the owner privately. The temporary password isn’t shown again." />
      <Card className="success-card">
        <div className="success-icon">
          <Icon name="check" size={28} />
        </div>
        <dl className="kv">
          <dt>Owner</dt>
          <dd>{owner.name}</dd>
          <dt>Mobile number</dt>
          <dd>
            {formatPhone(owner.phone)} <CopyButton text={owner.phone} label="Copy mobile number" />
          </dd>
          <dt>Username</dt>
          <dd className="mono">{owner.username}</dd>
          <dt>Temporary password</dt>
          <dd className="mono">
            {password} <CopyButton text={password} label="Copy password" />
          </dd>
        </dl>
        <div className="form-actions">
          <Button variant="secondary" icon="copy" onClick={() => navigator.clipboard.writeText(shareText).then(() => toast.success('Copied — paste it into WhatsApp or SMS.'))}>
            Copy message for the owner
          </Button>
          <Button icon="chevronRight" onClick={() => navigate(`/car-washes/${carWash.id}`)}>
            Open car wash
          </Button>
        </div>
      </Card>
    </>
  )
}
