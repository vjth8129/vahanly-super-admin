import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom'

import { AuthProvider, useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { ToastHost } from './components/Toast'
import { Spinner } from './components/ui'
import { CarWashDetailPage } from './pages/CarWashDetail'
import { CarWashesPage } from './pages/CarWashes'
import { ChangePasswordPage } from './pages/ChangePassword'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage } from './pages/Login'
import { OnboardPage } from './pages/Onboard'
import { ProfilePage } from './pages/Profile'
import { SignUpsPage } from './pages/SignUps'
import { UserDetailPage } from './pages/UserDetail'
import { UsersPage } from './pages/Users'
import { VehicleTypesPage } from './pages/VehicleTypes'

/** Signed-in admins only; a platform admin with an admin-set password must change it first. */
function RequireAdmin() {
  const { status, user } = useAuth()
  if (status === 'loading') return <Spinner label="Restoring your session…" />
  if (status !== 'signedIn') return <Navigate to="/login" replace />
  if (user?.mustChangePassword) return <ChangePasswordPage forced />
  return <Outlet />
}

function GuestOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <Spinner label="Restoring your session…" />
  return status === 'signedIn' ? <Navigate to="/" replace /> : <Outlet />
}

const router = createBrowserRouter(
  [
    { element: <GuestOnly />, children: [{ path: '/login', element: <LoginPage /> }] },
    {
      element: <RequireAdmin />,
      children: [
        {
          element: <Layout />,
          children: [
            { path: '/', element: <DashboardPage /> },
            { path: '/car-washes', element: <CarWashesPage /> },
            { path: '/car-washes/new', element: <OnboardPage /> },
            { path: '/car-washes/:id', element: <CarWashDetailPage /> },
            { path: '/sign-ups', element: <SignUpsPage /> },
            { path: '/users', element: <UsersPage /> },
            { path: '/users/:id', element: <UserDetailPage /> },
            { path: '/vehicle-types', element: <VehicleTypesPage /> },
            { path: '/profile', element: <ProfilePage /> },
          ],
        },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') },
)

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <ToastHost />
    </AuthProvider>
  )
}
