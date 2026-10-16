import type { CarWashStatus } from '../api'

/** Display form of a stored E.164 number: +919876543210 -> "+91 98765 43210". */
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return '—'
  const india = /^\+91(\d{5})(\d{5})$/.exec(phone)
  return india ? `+91 ${india[1]} ${india[2]}` : phone
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

/** "SUPER_ADMIN" -> "Super admin"; custom role names are shown as typed. */
export function roleLabel(name: string | undefined) {
  if (!name) return '—'
  if (!/^[A-Z_]+$/.test(name)) return name
  const words = name.toLowerCase().replace(/_/g, ' ')
  return words[0].toUpperCase() + words.slice(1)
}

export const STATUS_LABEL: Record<CarWashStatus, string> = {
  PENDING: 'Pending review',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  INACTIVE: 'Inactive',
}

export function initials(name: string | undefined) {
  return (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/** A Google Maps link for a pair of coordinates. */
export function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
}

/** One line for a car wash's address: "12 MG Road, Bengaluru, Karnataka 560001". */
export function formatAddress(cw: { address: string | null; city: string | null; state: string | null; postalCode: string | null }) {
  const region = [cw.state, cw.postalCode].filter(Boolean).join(' ')
  return [cw.address, cw.city, region].filter(Boolean).join(', ') || '—'
}

/** "Waiting 35 min" / "Waiting 3 h" - the owner was promised activation within 2 hours. */
export function waitingFor(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 60) return `Waiting ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours < 48 ? `Waiting ${hours} h` : `Waiting ${Math.floor(hours / 24)} days`
}
