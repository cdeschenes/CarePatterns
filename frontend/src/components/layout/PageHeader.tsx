/**
 * PageHeader — consistent page title bar with optional back button.
 *
 * Renders inside the scrollable main content area (not fixed).
 * The back button uses the browser history stack via useNavigate(-1).
 */

import { useNavigate } from 'react-router-dom'

interface PageHeaderProps {
  title: string
  showBack?: boolean
}

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function PageHeader({ title, showBack = false }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-cp-border bg-cp-bg">
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 rounded-lg text-cp-text-muted hover:text-cp-text hover:bg-cp-surface transition-colors"
          aria-label="Go back"
        >
          <BackIcon />
        </button>
      )}
      <h1 className="text-base font-semibold text-cp-text">{title}</h1>
    </div>
  )
}
