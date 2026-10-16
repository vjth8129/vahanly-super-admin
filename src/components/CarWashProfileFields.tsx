import { CURRENCIES, TIMEZONES, type ProfileForm } from '../lib/carWashProfile'
import { mapsUrl } from '../lib/format'
import { Field, Select } from './ui'

type Props = {
  form: ProfileForm
  onChange: (patch: Partial<ProfileForm>) => void
  /** While onboarding, the code follows the name until edited by hand. */
  onNameChange?: (name: string) => void
}

export function CarWashProfileFields({ form, onChange, onNameChange }: Props) {
  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ [k]: e.target.value })
  return (
    <div className="grid-2">
      <Field
        label="Name"
        value={form.name}
        onChange={(e) => (onNameChange ? onNameChange(e.target.value) : onChange({ name: e.target.value }))}
        required
        minLength={2}
        maxLength={150}
      />
      <Field
        label="Code"
        value={form.code}
        onChange={(e) => onChange({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '') })}
        required
        minLength={2}
        maxLength={50}
        className="mono-input"
        hint="Unique short ID, e.g. AQUA001. Letters, numbers, - and _."
      />
      <Field label="Business phone" type="tel" value={form.phone} onChange={set('phone')} maxLength={30} />
      <Field label="Business email" type="email" value={form.email} onChange={set('email')} />
      <Field
        label="GSTIN"
        value={form.gstNumber}
        onChange={(e) => onChange({ gstNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
        maxLength={15}
        className="mono-input"
        hint="15 characters, e.g. 29ABCDE1234F1Z5."
      />
      <div />
      <Field label="Address" value={form.address} onChange={set('address')} className="span-2" />
      <Field label="City" value={form.city} onChange={set('city')} maxLength={100} />
      <Field label="State" value={form.state} onChange={set('state')} maxLength={100} />
      <Field label="Country" value={form.country} onChange={set('country')} maxLength={100} />
      <Field label="Postal code" value={form.postalCode} onChange={set('postalCode')} maxLength={20} />
      <Field label="Latitude" inputMode="decimal" value={form.latitude} onChange={set('latitude')} placeholder="e.g. 12.9716" />
      <Field
        label="Longitude"
        inputMode="decimal"
        value={form.longitude}
        onChange={set('longitude')}
        placeholder="e.g. 77.5946"
        labelAccessory={
          isCoordinate(form.latitude, 90) && isCoordinate(form.longitude, 180) ? (
            <a className="link-btn" href={mapsUrl(Number(form.latitude), Number(form.longitude))} target="_blank" rel="noreferrer">
              View on map
            </a>
          ) : undefined
        }
      />
      <Select label="Timezone" value={form.timezone} onChange={(v) => onChange({ timezone: v })} options={withCurrent(TIMEZONES, form.timezone)} />
      <Select label="Currency" value={form.currency} onChange={(v) => onChange({ currency: v })} options={withCurrent(CURRENCIES, form.currency)} />
      <Field label="Description" value={form.description} onChange={set('description')} className="span-2" />
    </div>
  )
}

function withCurrent(values: string[], current: string) {
  const all = current && !values.includes(current) ? [current, ...values] : values
  return all.map((v) => ({ value: v, label: v }))
}

function isCoordinate(value: string, max: number) {
  return value.trim() !== '' && Math.abs(Number(value)) <= max
}
