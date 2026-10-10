import { useState, type FormEvent } from 'react'

import { errorMessage, vehicleCategoriesApi, type VehicleCategory } from '../api'
import { toast } from '../components/Toast'
import { Button, Card, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, StatusBadge } from '../components/ui'
import { useAsync } from '../lib/useAsync'

/** Private is the default for new vehicles and can't be switched off. */
const DEFAULT_CODE = 'PRIVATE'

/**
 * Platform-wide vehicle types (Private, Taxi, ...). Car washes set a rate per type on each
 * service, and the app asks for the type on every new wash.
 */
export function VehicleTypesPage() {
  const result = useAsync(() => vehicleCategoriesApi.list(), [])
  const [editing, setEditing] = useState<VehicleCategory | 'new' | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const toggle = async (c: VehicleCategory) => {
    setBusyId(c.id)
    try {
      await vehicleCategoriesApi.update(c.id, { status: c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success(c.status === 'ACTIVE' ? `${c.name} is no longer offered.` : `${c.name} is offered again.`)
      result.reload()
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setBusyId(null)
    }
  }

  const items = result.data ?? []

  return (
    <>
      <PageHeader
        title="Vehicle types"
        subtitle="Offered to every car wash. Each car wash sets its own rate per type on every service; staff pick the type when starting a wash."
        actions={
          <Button icon="plus" onClick={() => setEditing('new')}>
            Add vehicle type
          </Button>
        }
      />
      {result.error ? (
        <ErrorBanner message={result.error} onRetry={result.reload} />
      ) : !result.data ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="car" title="No vehicle types yet" />
      ) : (
        <Card>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th className="actions-col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      {c.code === DEFAULT_CODE && <span className="muted small"> · default</span>}
                      {c.description && <div className="muted small">{c.description}</div>}
                    </td>
                    <td className="nowrap muted">{c.code}</td>
                    <td className="num">{c.sortOrder}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="actions-col">
                      <div className="row-actions">
                        <Button variant="ghost" icon="edit" onClick={() => setEditing(c)}>
                          Edit
                        </Button>
                        {c.code !== DEFAULT_CODE && (
                          <Button
                            variant="ghost"
                            icon={c.status === 'ACTIVE' ? 'pause' : 'play'}
                            loading={busyId === c.id}
                            onClick={() => toggle(c)}>
                            {c.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && (
        <VehicleTypeModal
          category={editing === 'new' ? null : editing}
          nextOrder={Math.max(0, ...items.map((c) => c.sortOrder)) + 1}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            result.reload()
          }}
        />
      )}
    </>
  )
}

function VehicleTypeModal({
  category,
  nextOrder,
  onClose,
  onSaved,
}: {
  category: VehicleCategory | null
  nextOrder: number
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? nextOrder))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2 || trimmed.length > 50) return setError('The name must be 2–50 characters.')
    if (!/^\d+$/.test(sortOrder.trim())) return setError('Order must be a whole number, e.g. 3.')
    setBusy(true)
    setError(null)
    try {
      const body = { name: trimmed, description: description.trim() || null, sortOrder: Number(sortOrder) }
      if (category) await vehicleCategoriesApi.update(category.id, body)
      else await vehicleCategoriesApi.create({ ...body, description: body.description ?? undefined })
      toast.success(category ? `${trimmed} was updated.` : `${trimmed} was added. Car washes can now set a rate for it.`)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Modal
      title={category ? `Edit ${category.name}` : 'Add vehicle type'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="vehicle-type" icon="check" loading={busy}>
            Save
          </Button>
        </>
      }>
      <form id="vehicle-type" onSubmit={save} className="stack">
        {error && <div className="error-banner">{error}</div>}
        <Field
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Commercial"
          maxLength={50}
          required
          hint={category ? `Code: ${category.code} (can’t be changed)` : 'Shown to staff in the app.'}
        />
        <Field
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
        <Field
          label="Order"
          inputMode="numeric"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ''))}
          hint="Lower numbers are listed first."
        />
      </form>
    </Modal>
  )
}
