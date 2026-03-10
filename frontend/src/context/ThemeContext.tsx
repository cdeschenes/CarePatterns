/**
 * ThemeContext — loads the active theme on mount and applies its CSS custom
 * properties to document.documentElement.
 *
 * Uses plain axios client calls (not React Query) so the theme is applied
 * before any QueryClientProvider children make their first render, avoiding
 * a flash of un-themed content. The ThemeProvider must wrap QueryClientProvider
 * in the tree — see App.tsx.
 *
 * setTheme(id): calls PATCH /api/v1/themes/{id}/activate, then re-fetches
 * the full list and re-applies the new active theme's variables.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import client from '@/api/client'
import type { Theme } from '@/types'
import { applyThemeVariables } from '@/utils/theme'

interface ThemeContextValue {
  activeTheme: Theme | null
  themes: Theme[]
  setTheme: (id: number) => Promise<void>
  isLoading: boolean
  error: string | null
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

async function fetchThemes(): Promise<Theme[]> {
  const { data } = await client.get<Theme[]>('/api/v1/themes')
  return data
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themes, setThemes] = useState<Theme[]>([])
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load themes on mount and apply the active one
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const loaded = await fetchThemes()
        if (cancelled) return
        setThemes(loaded)
        const active = loaded.find((t) => t.is_active) ?? loaded[0] ?? null
        setActiveTheme(active)
        if (active) applyThemeVariables(active.variables)
      } catch (err) {
        if (cancelled) return
        console.error('[ThemeContext] Failed to load themes:', err)
        setError('Failed to load themes.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const setTheme = useCallback(async (id: number): Promise<void> => {
    try {
      await client.patch<Theme>(`/api/v1/themes/${id}/activate`)
      const refreshed = await fetchThemes()
      setThemes(refreshed)
      const active = refreshed.find((t) => t.is_active) ?? null
      setActiveTheme(active)
      if (active) applyThemeVariables(active.variables)
    } catch (err) {
      console.error('[ThemeContext] Failed to activate theme:', err)
      throw err
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ activeTheme, themes, setTheme, isLoading, error }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (ctx === null) {
    throw new Error('useThemeContext must be used inside <ThemeProvider>')
  }
  return ctx
}
