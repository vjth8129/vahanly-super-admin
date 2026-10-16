import type { CarWashProfile } from '../api'

export type ProfileForm = Required<{ [K in keyof CarWashProfile]: string }>

export const EMPTY_PROFILE: ProfileForm = {
  name: '',
  code: '',
  description: '',
  phone: '',
  email: '',
  gstNumber: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  latitude: '',
  longitude: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
}

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC']
export const CURRENCIES = ['INR', 'AED', 'SGD', 'GBP', 'USD', 'EUR']

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

const NUMERIC_FIELDS = new Set<keyof ProfileForm>(['latitude', 'longitude'])
const UPPERCASE_FIELDS = new Set<keyof ProfileForm>(['code', 'gstNumber'])

/** Form values -> API body: blank optional fields are left out rather than sent as "". */
export function toProfileBody(form: ProfileForm): CarWashProfile {
  const body: Record<string, string | number> = {}
  for (const [k, v] of Object.entries(form) as [keyof ProfileForm, string][]) {
    const value = v.trim()
    if (!value) continue
    body[k] = NUMERIC_FIELDS.has(k) ? Number(value) : UPPERCASE_FIELDS.has(k) ? value.toUpperCase() : value
  }
  return body as CarWashProfile
}

/** The first problem with the form that the browser's own validation doesn't catch. */
export function profileError(form: ProfileForm): string | null {
  const gst = form.gstNumber.trim().toUpperCase()
  if (gst && !GSTIN_PATTERN.test(gst)) return 'GSTIN must be 15 characters, e.g. 29ABCDE1234F1Z5.'
  const lat = form.latitude.trim()
  const lng = form.longitude.trim()
  if (!!lat !== !!lng) return 'Enter both latitude and longitude, or leave both empty.'
  if (lat && !(Math.abs(Number(lat)) <= 90)) return 'Latitude must be a number between -90 and 90.'
  if (lng && !(Math.abs(Number(lng)) <= 180)) return 'Longitude must be a number between -180 and 180.'
  return null
}

/** A short code from the name: "Aqua Shine Car Wash" -> "AQUASHINE". */
export function suggestCode(name: string) {
  return name
    .toUpperCase()
    .replace(/\b(CAR|WASH|THE|AND)\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}
