/**
 * Shared theme utility — apply a theme's CSS custom properties to :root.
 *
 * Used by both ThemeContext (on initial load and after activation) and
 * ThemeSelector (for optimistic pre-activation updates).
 *
 * Variable values are stored as bare RGB triplets ("R G B") so that
 * Tailwind's opacity modifier syntax works:
 *   bg-cp-primary/10  →  background: rgb(var(--color-primary) / 0.1)
 */

export function applyThemeVariables(variables: Record<string, string>): void {
  const root = document.documentElement
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value)
  }
}
