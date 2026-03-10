/**
 * ReminderModal — full-screen overlay listing overdue scheduled items.
 *
 * Behaviour
 * ----------
 * - Opens when `items.length > 0`. Caller controls visibility by conditionally
 *   rendering this component.
 * - Each row has a "Log now" button. On success the row is removed from local
 *   state. When the last row is removed, `onDismiss` is called automatically.
 * - "Dismiss" button calls `onDismiss` without logging anything.
 * - Escape key calls `onDismiss`.
 * - Focus is trapped inside the modal panel while it is open.
 * - Animate in via CSS transition (slide-up + fade); animate out is not needed
 *   because the caller unmounts the component immediately on dismiss.
 *
 * Focus trap implementation
 * -------------------------
 * On mount: collect all focusable descendants and focus the first one.
 * On Tab / Shift+Tab: if focus would leave the panel, wrap it to the other end.
 * This covers: buttons, inputs, links, [tabindex] elements.
 *
 * `useCreateLogEntry` is called per item — hooks must not be called
 * conditionally, so each row is its own component (`ReminderRow`) which owns
 * its own mutation instance.
 *
 * Props
 * -----
 * items     — list of ReminderItem from useReminders (id + name only)
 * onDismiss — called when user closes modal without logging, or after last log
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useCreateLogEntry } from '@/api/logEntries'
import type { ReminderItem } from '@/types'

// ---------------------------------------------------------------------------
// Focus trap helpers
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CloseIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 text-cp-primary"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

// ---------------------------------------------------------------------------
// ReminderRow — one row per overdue item; owns its own log mutation
// ---------------------------------------------------------------------------

type RowState = 'idle' | 'loading' | 'success' | 'error'

interface ReminderRowProps {
  item: ReminderItem
  onLogged: (id: number) => void
}

function ReminderRow({ item, onLogged }: ReminderRowProps) {
  const [rowState, setRowState] = useState<RowState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logMutation = useCreateLogEntry(item.id)

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [])

  const handleLog = useCallback(() => {
    if (rowState !== 'idle') return

    setRowState('loading')
    setErrorMsg(null)

    logMutation.mutate(
      {},
      {
        onSuccess: () => {
          setRowState('success')
          // Brief success feedback, then remove the row
          timerRef.current = setTimeout(() => {
            onLogged(item.id)
          }, 800)
        },
        onError: (err) => {
          const msg = err.message || 'Failed to log. Try again.'
          setErrorMsg(msg)
          setRowState('error')
          timerRef.current = setTimeout(() => {
            setRowState('idle')
            setErrorMsg(null)
          }, 3000)
        },
      },
    )
  }, [rowState, logMutation, item.id, onLogged])

  return (
    <li className="flex items-center gap-3 py-3 border-b border-cp-border last:border-0">
      {/* Item name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-cp-text truncate">{item.name}</p>
        {errorMsg !== null && (
          <p className="text-xs text-cp-danger mt-0.5" role="alert">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Log button */}
      <button
        type="button"
        onClick={handleLog}
        disabled={rowState !== 'idle'}
        aria-label={
          rowState === 'success'
            ? `${item.name} logged`
            : rowState === 'loading'
              ? `Logging ${item.name}…`
              : `Log ${item.name} now`
        }
        className={[
          'flex-shrink-0 flex items-center justify-center gap-1.5',
          'min-w-[80px] min-h-[44px] px-3 rounded-lg',
          'text-sm font-medium transition-colors',
          rowState === 'success'
            ? 'bg-green-500/15 text-green-600'
            : rowState === 'error'
              ? 'bg-cp-surface border border-cp-danger text-cp-danger'
              : 'bg-cp-primary text-white active:bg-cp-accent',
          rowState !== 'idle' ? 'opacity-75 cursor-not-allowed' : '',
        ].join(' ')}
      >
        {rowState === 'loading' && <SpinnerIcon />}
        {rowState === 'success' && <CheckIcon />}
        <span>
          {rowState === 'idle' && 'Log'}
          {rowState === 'loading' && 'Logging…'}
          {rowState === 'success' && 'Done'}
          {rowState === 'error' && 'Retry'}
        </span>
      </button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// ReminderModal
// ---------------------------------------------------------------------------

export interface ReminderModalProps {
  items: ReminderItem[]
  onDismiss: () => void
}

export default function ReminderModal({ items, onDismiss }: ReminderModalProps) {
  // Local copy of items so we can remove rows as they are logged
  const [visibleItems, setVisibleItems] = useState<ReminderItem[]>(items)

  // Sync when parent provides a fresh list (next poll cycle)
  useEffect(() => {
    setVisibleItems(items)
  }, [items])

  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Trigger the CSS transition after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Focus the first focusable element on mount
  useEffect(() => {
    const panel = panelRef.current
    if (panel === null) return
    const focusable = getFocusableElements(panel)
    focusable[0]?.focus()
  }, [])

  // Keyboard: Escape to dismiss, Tab trap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onDismiss()
        return
      }

      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (panel === null) return

      const focusable = getFocusableElements(panel)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // Called by each row when its log succeeds
  const handleItemLogged = useCallback(
    (id: number) => {
      setVisibleItems((prev) => {
        const next = prev.filter((item) => item.id !== id)
        if (next.length === 0) {
          // Last item logged — auto-dismiss
          onDismiss()
        }
        return next
      })
    },
    [onDismiss],
  )

  const count = visibleItems.length

  return (
    // Backdrop — fixed, covers full viewport, semi-transparent black
    // Using bg-black/50 rather than cp-* because Tailwind needs a known RGB
    // value to apply opacity modifiers; CSS variable colors do not support this.
    <div
      className={[
        'fixed inset-0 z-50 flex items-end justify-center sm:items-center',
        'transition-opacity duration-200',
        mounted ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      aria-hidden="true"
      // Tapping the backdrop dismisses the modal
      onClick={onDismiss}
    >
      {/* Modal panel — stops click propagation so backdrop tap doesn't fire */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-modal-title"
        onClick={(e) => e.stopPropagation()}
        className={[
          'relative w-full max-w-md mx-auto',
          'bg-cp-surface rounded-t-2xl sm:rounded-2xl',
          'shadow-xl overflow-hidden',
          'transition-transform duration-200',
          mounted ? 'translate-y-0' : 'translate-y-8',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-cp-border">
          <div className="flex items-center gap-2">
            <BellIcon />
            <h2
              id="reminder-modal-title"
              className="text-base font-semibold text-cp-text"
            >
              Reminders
            </h2>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cp-primary text-white text-xs font-bold">
              {count}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close reminders"
            className="flex items-center justify-center w-11 h-11 -mr-2 rounded-lg text-cp-text-muted hover:text-cp-text hover:bg-cp-bg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body — scrollable in case there are many items */}
        <div className="px-5 overflow-y-auto max-h-[60vh]">
          {count === 0 ? (
            // Should not normally be visible (modal auto-closes), but guards
            // against the brief render between last item logged and onDismiss
            <p className="py-6 text-center text-sm text-cp-text-muted">
              All caught up!
            </p>
          ) : (
            <ul aria-label="Overdue items" className="divide-y-0">
              {visibleItems.map((item) => (
                <ReminderRow
                  key={item.id}
                  item={item}
                  onLogged={handleItemLogged}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-cp-border">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full min-h-[44px] rounded-lg border border-cp-border bg-cp-bg text-cp-text font-medium text-sm active:bg-cp-surface transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
