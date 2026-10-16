import { http, type TokenPair } from './client'

export { ApiError, errorMessage, getTokens, saveTokens } from './client'
export type { Paged, Pagination } from './client'

export const STATUSES = ['ACTIVE', 'SUSPENDED', 'INACTIVE'] as const
export type Status = (typeof STATUSES)[number]

/** Car washes can also be PENDING: signed up from the app and waiting for review. */
export const CAR_WASH_STATUSES = ['PENDING', ...STATUSES] as const
export type CarWashStatus = (typeof CAR_WASH_STATUSES)[number]

export type AccountIdentifier = { phone: string } | { username: string }

export type Me = {
  id: string
  username: string
  name: string
  email: string | null
  phone: string | null
  role: { id: string; name: string }
  permissions: string[]
  carWash: { id: string; name: string } | null
  mustChangePassword: boolean
}

export type CarWash = {
  id: string
  name: string
  code: string
  description: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  latitude: number | null
  longitude: number | null
  /** GSTIN, e.g. 29ABCDE1234F1Z5. */
  gstNumber: string | null
  status: CarWashStatus
  /** ADMIN: onboarded here. SELF_SIGNUP: the owner signed up from the app. */
  source: 'ADMIN' | 'SELF_SIGNUP'
  timezone: string
  currency: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  /** Only on list responses. */
  userCount?: number
  /** Only on the detail response. */
  owners?: CarWashOwner[]
}

export type CarWashOwner = { id: string; name: string; username: string; phone: string | null; email: string | null; createdAt: string }

export type CarWashProfile = Partial<
  Pick<
    CarWash,
    'name' | 'code' | 'description' | 'phone' | 'email' | 'gstNumber' | 'address' | 'city' | 'state' | 'country' | 'postalCode' | 'latitude' | 'longitude' | 'timezone' | 'currency'
  >
>

export type NewOwner = { name: string; phone: string; username: string; password: string; email?: string }
export type OnboardedCarWash = CarWash & { owner?: { id: string; name: string; username: string; phone: string } }

export type PlatformStats = {
  carWashes: { total: number; active: number; suspended: number; inactive: number; pending: number }
  users: { total: number; active: number }
  orders: { today: number; last30Days: number }
}

export type User = {
  id: string
  carWashId: string | null
  roleId: string
  username: string
  name: string
  email: string | null
  phone: string | null
  status: Status
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
  role?: { id: string; name: string; carWashId?: string | null }
  carWash?: { id: string; name: string; status?: Status } | null
}

export type Role = { id: string; name: string; description: string | null; carWashId: string | null; isSystem: boolean }

export type NewUser = {
  carWashId: string
  name: string
  phone: string
  username: string
  password: string
  roleId: string
  email?: string
}

export const authApi = {
  login: (account: AccountIdentifier, password: string) =>
    http.post<TokenPair & { user: { role: string; mustChangePassword: boolean } }>(
      '/auth/login',
      { ...account, password },
      { auth: false },
    ),
  logout: (refreshToken: string) => http.post<unknown>('/auth/logout', { refreshToken }, { auth: false }),
  me: () => http.get<Me>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<TokenPair>('/auth/change-password', { currentPassword, newPassword }),
}

export const carWashesApi = {
  stats: () => http.get<PlatformStats>('/car-washes/stats'),
  list: (q: { page?: number; limit?: number; search?: string; status?: CarWashStatus } = {}) =>
    http.list<CarWash>('/car-washes', q),
  get: (id: string) => http.get<CarWash>(`/car-washes/${id}`),
  onboard: (body: CarWashProfile & { name: string; code: string; owner: NewOwner }) =>
    http.post<OnboardedCarWash>('/car-washes', body),
  update: (id: string, body: CarWashProfile) => http.patch<CarWash>(`/car-washes/${id}`, body),
  /** Also how a pending sign-up is approved (ACTIVE) or rejected (INACTIVE). */
  setStatus: (id: string, status: Status) => http.patch<CarWash>(`/car-washes/${id}`, { status }),
}

export const usersApi = {
  list: (q: { page?: number; limit?: number; search?: string; status?: Status; carWashId?: string } = {}) =>
    http.list<User>('/users', q),
  get: (id: string) => http.get<User>(`/users/${id}`),
  create: (body: NewUser) => http.post<User>('/users', body),
  update: (id: string, body: { name?: string; email?: string | null; phone?: string; roleId?: string }) =>
    http.patch<User>(`/users/${id}`, body),
  setStatus: (id: string, status: Status) => http.patch<User>(`/users/${id}/status`, { status }),
  resetPassword: (id: string, newPassword: string) =>
    http.post<unknown>(`/users/${id}/reset-password`, { newPassword }),
  /** Soft delete: the user loses access and disappears from lists. */
  remove: (id: string) => http.delete<unknown>(`/users/${id}`),
}

/** How a vehicle is used (Private, Taxi, ...); each car wash sets a service rate per category. */
export type VehicleCategory = {
  id: string
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'INACTIVE'
  sortOrder: number
  createdAt: string
}

export type VehicleCategoryInput = { name: string; description?: string | null; sortOrder?: number }

export const vehicleCategoriesApi = {
  list: () => http.get<VehicleCategory[]>('/vehicle-categories', { includeInactive: 'true' }),
  create: (body: VehicleCategoryInput) => http.post<VehicleCategory>('/vehicle-categories', body),
  update: (id: string, body: Partial<VehicleCategoryInput> & { status?: 'ACTIVE' | 'INACTIVE' }) =>
    http.patch<VehicleCategory>(`/vehicle-categories/${id}`, body),
}

export const rolesApi = {
  list: () => http.list<Role>('/roles'),
}
