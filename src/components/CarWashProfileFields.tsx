import { CURRENCIES, TIMEZONES, type ProfileForm } from '../lib/carWashProfile'
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
      <Field label="Address" value={form.address} onChange={set('address')} className="span-2" />
      <Field label="City" value={form.city} onChange={set('city')} maxLength={100} />
      <Field label="State" value={form.state} onChange={set('state')} maxLength={100} />
      <Field label="Country" value={form.country} onChange={set('country')} maxLength={100} />
      <Field label="Postal code" value={form.postalCode} onChange={set('postalCode')} maxLength={20} />
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
