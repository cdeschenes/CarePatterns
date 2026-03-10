/**
 * App — root component.
 *
 * Provider order (outermost first):
 *   ThemeProvider      — applies CSS vars to :root before children render
 *   QueryClientProvider — React Query cache, available to all pages
 *   BrowserRouter      — routing
 *
 * ThemeProvider is outermost so CSS variables are set before any themed
 * component paints. QueryClientProvider is inside ThemeProvider so the
 * themes query (run by ThemeContext using plain axios) is separate from
 * the main query cache.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@/context/ThemeContext'
import AppShell from '@/components/layout/AppShell'
import Dashboard from '@/pages/Dashboard'
import ItemNew from '@/pages/ItemNew'
import ItemEdit from '@/pages/ItemEdit'
import ItemDetail from '@/pages/ItemDetail'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30 s — data stays fresh briefly on mobile
      retry: 1,                 // one retry on failure; reminder polls handle their own
      refetchOnWindowFocus: true,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="items/new" element={<ItemNew />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route path="items/:id/edit" element={<ItemEdit />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              {/* Catch-all: redirect unknown paths to dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
