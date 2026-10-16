import { useState } from 'react'
import { Link } from 'react-router-dom'

import { carWashesApi, errorMessage, type CarWash } from '../api'
import { formatAddress, formatDate, formatPhone, mapsUrl, waitingFor } from '../lib/format'
import { Icon } from './Icon'
import { toast } from './Toast'
import { Button, Card, CopyButton, Modal } from './ui'

type Decision = 'approve' | 'reject'

const DECISIONS = {
  approve: {
    title: 'Approve and activate',
    status: 'ACTIVE',
    explain: 'The owner can sign in to the Vahanly app straight away with the mobile number and password they signed up with.',
  },
  reject: {
    title: 'Reject sign-up',
    status: 'INACTIVE',
    explain:
      'The car wash is switched off and the owner sees “no longer active, please contact Vahanly customer care” when signing in. You can still activate it later.',
  },
} as const

/**
 * What a platform admin checks before activating a car wash that signed itself up:
 * the GSTIN, where the shop is (from the owner's phone GPS) and who the owner is.
 */
export function SignupDetails({ carWash }: { carWash: CarWash }) {
  const owner = carWash.owners?.[0]
  const hasLocation = carWash.latitude != null && carWash.longitude != null
  return (
    <dl className="kv">
      <dt>GSTIN</dt>
      <dd className="mono">
        {carWash.gstNumber ?? '—'} {carWash.gstNumber && <CopyButton text={carWash.gstNumber} label="Copy GSTIN" />}
      </dd>
      <dt>Address</dt>
      <dd>{formatAddress(carWash)}</dd>
      <dt>Location</dt>
      <dd>
        {hasLocation ? (
          <a className="link" href={mapsUrl(carWash.latitude!, carWash.longitude!)} target="_blank" rel="noreferrer">
            {carWash.latitude!.toFixed(5)}, {carWash.longitude!.toFixed(5)} · View on map
          </a>
        ) : (
          '—'
        )}
      </dd>
      <dt>Business phone</dt>
      <dd>{formatPhone(carWash.phone)}</dd>
      {carWash.email && (
        <>
          <dt>Business email</dt>
          <dd>{carWash.email}</dd>
        </>
      )}
      {owner && (
        <>
          <dt>Owner</dt>
          <dd>
            {owner.name} · {formatPhone(owner.phone)}
            {owner.email ? ` · ${owner.email}` : ''}
          </dd>
        </>
      )}
      <dt>Signed up</dt>
      <dd>{formatDate(carWash.createdAt)}</dd>
    </dl>
  )
}

/** Approve (→ ACTIVE) or reject (→ INACTIVE) a pending sign-up, after a confirmation. */
export function SignupDecisionButtons({ carWash, onDecided }: { carWash: CarWash; onDecided: (cw: CarWash) => void }) {
  const [decision, setDecision] = useState<Decision | null>(null)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    if (!decision) return
    setBusy(true)
    try {
      const updated = await carWashesApi.setStatus(carWash.id, DECISIONS[decision].status)
      toast.success(decision === 'approve' ? `${carWash.name} is now active.` : `${carWash.name}’s sign-up was rejected.`)
      setDecision(null)
      onDecided(updated)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="danger" icon="x" onClick={() => setDecision('reject')}>
        Reject
      </Button>
      <Button icon="check" onClick={() => setDecision('approve')}>
        Approve &amp; activate
      </Button>
      {decision && (
        <Modal
          title={`${DECISIONS[decision].title}: ${carWash.name}?`}
          onClose={() => setDecision(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button variant={decision === 'approve' ? 'primary' : 'danger'} icon={decision === 'approve' ? 'check' : 'x'} loading={busy} onClick={confirm}>
                {DECISIONS[decision].title}
              </Button>
            </>
          }>
          <p>{DECISIONS[decision].explain}</p>
        </Modal>
      )}
    </>
  )
}

/** One pending sign-up on the Sign-ups page: the details to check and the decision buttons. */
export function SignupReviewCard({ carWash, onDecided }: { carWash: CarWash; onDecided: () => void }) {
  return (
    <Card
      title={
        <Link to={`/car-washes/${carWash.id}`} className="link">
          {carWash.name}
        </Link>
      }
      actions={
        <span className="muted small">
          <Icon name="clock" size={14} /> {waitingFor(carWash.createdAt)}
        </span>
      }>
      <SignupDetails carWash={carWash} />
      <div className="review-actions">
        <SignupDecisionButtons carWash={carWash} onDecided={onDecided} />
      </div>
    </Card>
  )
}
