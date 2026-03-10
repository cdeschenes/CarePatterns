/**
 * AppShell — mobile-first fixed layout.
 *
 * Structure:
 *   - Fixed top header (h-14) with app name
 *   - Scrollable main content area with top and bottom padding
 *   - Fixed bottom navigation bar (h-16) with:
 *       [Dashboard] [Reports] [Add] [Settings]
 *
 * The main content area uses pt-14 (clears header) and pb-20 (clears nav bar)
 * so no content is ever hidden behind a fixed element.
 *
 * Icons are inline SVG — no icon library dependency.
 */

import { NavLink, Outlet } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

function HomeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
      aria-hidden="true"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: <HomeIcon /> },
  { to: '/reports', label: 'Reports', icon: <ChartIcon /> },
  { to: '/items/new', label: 'Add', icon: <PlusIcon /> },
  { to: '/settings', label: 'Settings', icon: <GearIcon /> },
]

function NavTab({ to, label, icon }: NavItem) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        [
          'flex flex-1 flex-col items-center justify-center gap-0.5 relative',
          'text-xs font-medium transition-colors',
          isActive ? 'text-cp-primary' : 'text-cp-text-muted hover:text-cp-text',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute inset-x-3 top-1.5 h-8 rounded-full bg-cp-primary/15" />
          )}
          <span className="relative">{icon}</span>
          <span className="relative">{label}</span>
        </>
      )}
    </NavLink>
  )
}

export default function AppShell() {
  return (
    <div className="min-h-screen bg-cp-bg text-cp-text">
      {/* Fixed top header */}
      <header className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4">
        <span className="text-lg font-bold text-white tracking-tight drop-shadow-sm">
          CarePatterns
        </span>
      </header>

      {/* Scrollable page content — clears header (pt-14) and nav bar (pb-20) */}
      <main className="pt-14 pb-20 min-h-screen">
        <Outlet />
      </main>

      {/* Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-cp-surface/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex items-stretch">
        {NAV_ITEMS.map(item => (
          <NavTab key={item.to} {...item} />
        ))}
      </nav>
    </div>
  )
}
