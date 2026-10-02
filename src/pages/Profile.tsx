import { useAuth } from '../auth/AuthContext'
import { Button, Card, PageHeader } from '../components/ui'
import { formatPhone, initials } from '../lib/format'
import { ChangePasswordForm } from './ChangePassword'

export function ProfilePage() {
  const { user, signOut } = useAuth()
  if (!user) return null
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid-profile">
        <Card>
          <div className="profile-head">
            <span className="avatar avatar-lg">{initials(user.name)}</span>
            <div>
              <h2>{user.name}</h2>
              <p className="muted">@{user.username} · Platform admin</p>
            </div>
          </div>
          <dl className="kv">
            <dt>Mobile number</dt>
            <dd>{formatPhone(user.phone)}</dd>
            <dt>Email</dt>
            <dd>{user.email ?? '—'}</dd>
            <dt>Access</dt>
            <dd>All car washes ({user.permissions.length} permissions)</dd>
          </dl>
          <Button variant="danger" icon="logout" onClick={signOut}>
            Sign out
          </Button>
        </Card>
        <Card title="Change password">
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  )
}
