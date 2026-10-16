import { SignupReviewCard } from '../components/SignupReview'
import { EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui'
import { loadPendingSignups } from '../lib/signups'
import { useAsync } from '../lib/useAsync'

export function SignUpsPage() {
  const pending = useAsync(() => loadPendingSignups(), [])

  return (
    <>
      <PageHeader
        title="Self sign-ups"
        subtitle="Car washes that signed up from the Vahanly app. Check the GSTIN and location, then approve to let the owner sign in. Owners are told it takes up to 2 hours."
      />
      {pending.error ? (
        <ErrorBanner message={pending.error} onRetry={pending.reload} />
      ) : !pending.data ? (
        <Spinner />
      ) : pending.data.length === 0 ? (
        <EmptyState icon="inbox" title="No sign-ups waiting for review">
          <p className="muted">New sign-ups from the app show up here.</p>
        </EmptyState>
      ) : (
        <div className="review-list">
          {pending.data.map((cw) => (
            <SignupReviewCard key={cw.id} carWash={cw} onDecided={pending.reload} />
          ))}
        </div>
      )}
    </>
  )
}
