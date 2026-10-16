import { carWashesApi } from '../api'

/** Loads the pending sign-ups with their owners (the list endpoint doesn't include owners). */
export function loadPendingSignups(limit = 50) {
  return carWashesApi
    .list({ status: 'PENDING', limit })
    .then((r) => Promise.all(r.items.map((cw) => carWashesApi.get(cw.id))))
    // Oldest first: they've been waiting longest.
    .then((items) => items.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
}
