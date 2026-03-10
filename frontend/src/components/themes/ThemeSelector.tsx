/**
 * ThemeSelector — displays all available themes as selectable tiles.
 *
 * Each tile shows the theme name, a 4-swatch color strip, and an active
 * indicator. Tapping a tile immediately applies the theme's CSS variables
 * (optimistic update), then calls `setTheme(id)` from ThemeContext to
 * persist the change. If the API call fails, the previous theme's variables
 * are re-applied and an error message is shown.
 *
 * Optimistic update rationale
 * ---------------------------
 * `theme.variables` is already in local state (from `themes` in context),
 * so we can call `applyThemeVariables` immediately without waiting for the
 * PATCH response. This makes the switch feel instant. On failure we revert
 * by re-applying the previous active theme's variables.
 *
 * Color swatches
 * --------------
 * Swatches show the theme's OWN colors (from `theme.variables`), not the
 * currently active CSS variables. They must use inline style with the
 * literal hex/rgb strings from `theme.variables` — Tailwind class names
 * reference CSS custom properties which always reflect the ACTIVE theme.
 *
 * The four swatch keys are: --color-bg, --color-surface,
 * --color-primary, --color-accent.
 */

import { useCallback, useState } from 'react'
import { useThemeContext } from '@/context/ThemeContext'
import type { Theme } from '@/types'
import { applyThemeVariables } from '@/utils/theme'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SWATCH_KEYS = [
  '--color-bg',
  '--color-surface',
  '--color-primary',
  '--color-accent',
] as const

/**
 * Convert a theme variable value to a CSS color string.
 * Values are stored as bare RGB triplets ("R G B") to support Tailwind opacity
 * modifiers at the class level. Swatches need the value wrapped in rgb().
 */
function toRgb(value: string | undefined): string {
  if (!value) return '#cccccc'
  // Already a hex or rgb(...) value — pass through unchanged
  if (value.startsWith('#') || value.startsWith('rgb')) return value
  // Bare RGB triplet — wrap it
  return `rgb(${value})`
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// ThemeTile — one selectable theme card
// ---------------------------------------------------------------------------

interface ThemeTileProps {
  theme: Theme
  isActive: boolean
  isActivating: boolean
  isAnyActivating: boolean
  onSelect: (theme: Theme) => void
}

function ThemeTile({
  theme,
  isActive,
  isActivating,
  isAnyActivating,
  onSelect,
}: ThemeTileProps) {
  const isDisabled = isAnyActivating && !isActivating

  return (
    <button
      type="button"
      onClick={() => onSelect(theme)}
      disabled={isDisabled}
      aria-pressed={isActive}
      aria-label={`${isActive ? 'Active theme: ' : 'Select theme: '}${theme.name}`}
      className={[
        // Base: minimum touch target, full width card layout
        'relative w-full min-h-[44px] rounded-xl border-2 p-3',
        'flex items-center gap-3 text-left transition-colors',
        // Active border uses cp-primary token (always correct — it IS the active theme at this point)
        isActive
          ? 'border-cp-primary bg-cp-surface shadow-sm'
          : 'border-cp-border bg-cp-surface hover:border-cp-text-muted',
        // Muted appearance while a different tile is activating
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Color swatch strip */}
      <div className="flex gap-1 flex-shrink-0" aria-hidden="true">
        {SWATCH_KEYS.map((key) => (
          <span
            key={key}
            className="w-7 h-7 rounded-md border border-black/10"
            style={{ backgroundColor: toRgb(theme.variables[key]) }}
          />
        ))}
      </div>

      {/* Theme name */}
      <span className="flex-1 text-sm font-medium text-cp-text truncate">
        {theme.name}
        {theme.is_builtin && (
          <span className="ml-1.5 text-xs font-normal text-cp-text-muted">
            (built-in)
          </span>
        )}
      </span>

      {/* Status indicator — spinner while activating, checkmark when active */}
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
        {isActivating ? (
          <span className="text-cp-primary">
            <SpinnerIcon />
          </span>
        ) : isActive ? (
          <span className="text-cp-primary">
            <CheckIcon />
          </span>
        ) : null}
      </span>
    </button>
  )
}

// ---------------------------------------------------------------------------
// ThemeSelector — main component
// ---------------------------------------------------------------------------

export default function ThemeSelector() {
  const { themes, activeTheme, setTheme, isLoading } = useThemeContext()
  const [activatingId, setActivatingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = useCallback(
    async (theme: Theme) => {
      // No-op if already active or another activation is in progress
      if (theme.id === activeTheme?.id || activatingId !== null) return

      setError(null)
      setActivatingId(theme.id)

      // Optimistic: apply the new theme's variables immediately so the UI
      // responds before the API round-trip completes
      applyThemeVariables(theme.variables)

      try {
        await setTheme(theme.id)
      } catch {
        // Revert to previous active theme's variables on failure
        if (activeTheme !== null) {
          applyThemeVariables(activeTheme.variables)
        }
        setError(`Failed to activate "${theme.name}". Please try again.`)
      } finally {
        setActivatingId(null)
      }
    },
    [activeTheme, activatingId, setTheme],
  )

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-[60px] rounded-xl border-2 border-cp-border bg-cp-surface"
          />
        ))}
      </div>
    )
  }

  if (themes.length === 0) {
    return (
      <p className="text-sm text-cp-text-muted">
        No themes available.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {themes.map((theme) => (
        <ThemeTile
          key={theme.id}
          theme={theme}
          isActive={theme.id === activeTheme?.id}
          isActivating={activatingId === theme.id}
          isAnyActivating={activatingId !== null}
          onSelect={(t) => void handleSelect(t)}
        />
      ))}

      {error !== null && (
        <p className="text-sm text-cp-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
