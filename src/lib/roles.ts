import type { Role } from '../api'

/** Roles a platform admin can give someone in this car wash (never platform roles). */
export function rolesFor(roles: Role[], carWashId: string | null) {
  return roles.filter(
    (r) => r.name !== 'SUPER_ADMIN' && r.name !== 'CUSTOMER' && (r.carWashId === null || r.carWashId === carWashId),
  )
}
