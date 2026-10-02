import type { CarWashProfile } from '../api'

export type ProfileForm = Required<{ [K in keyof CarWashProfile]: string }>

export const EMPTY_PROFILE: ProfileForm = {
  name: '',
  code: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  country: 'India',
  postalCode: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
}

export const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC']
export const CURRENCIES = ['INR', 'AED', 'SGD', 'GBP', 'USD', 'EUR']

/** Form values -> API body: blank optional fields are left out rather than sent as "". */
export function toProfileBody(form: ProfileForm): CarWashProfile {
  const body: CarWashProfile = {}
  for (const [k, v] of Object.entries(form) as [keyof ProfileForm, string][]) {
    const value = v.trim()
    if (value) body[k] = k === 'code' ? value.toUpperCase() : value
  }
  return body
}

/** A short code from the name: "Aqua Shine Car Wash" -> "AQUASHINE". */
export function suggestCode(name: string) {
  return name
    .toUpperCase()
    .replace(/\b(CAR|WASH|THE|AND)\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 12)
}
