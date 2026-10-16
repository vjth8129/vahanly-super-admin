import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from '../auth/AuthContext'
import { initials } from '../lib/format'
import { Icon, type IconName } from './Icon'

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/car-washes', label: 'Car washes', icon: 'building' },
  { to: '/sign-ups', label: 'Sign-ups', icon: 'inbox' },
  { to: '/users', label: 'Users', icon: 'users' },
  { to: '/vehicle-types', label: 'Vehicle types', icon: 'car' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const [lastPath, setLastPath] = useState(location.pathname)
  // Close the mobile menu after navigating.
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setMenuOpen(false)
  }

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width={36} height={36} />
          <div>
            <strong>Vahanly</strong>
            <span>Admin portal</span>
          </div>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <span className="avatar">{initials(user?.name)}</span>
            <div>
              <strong>{user?.name}</strong>
              <span>Platform admin</span>
            </div>
          </div>
          <button type="button" className="nav-link" onClick={signOut}>
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <div className="main">
        <div className="topbar">
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Icon name="menu" size={22} />
          </button>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width={28} height={28} />
          <strong>Vahanly Admin</strong>
        </div>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
