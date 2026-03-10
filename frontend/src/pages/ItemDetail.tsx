/**
 * ItemDetail — shows item metadata, schedule summary, log history, and actions.
 *
 * Actions:
 *   Log button — tap to create a log entry directly from this page
 *   Edit       — navigates to /items/:id/edit
 *   Archive    — soft-deletes the item after a JS confirm(); navigates to /
 *
 * Log history is paginated (20 per page) using the useLogEntries hook.
 * The log button uses the same tap-to-log pattern as ItemCard.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeleteItem, useItem } from '@/api/items'
import { useCreateLogEntry, useLogEntries } from '@/api/logEntries'
import PageHeader from '@/components/layout/PageHeader'
import ItemScheduleBadge from '@/components/items/ItemScheduleBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDateTime } from '@/utils/dates'

// --- Log button (same UX as ItemCard, extracted to keep detail page readable) ---

type LogState = 'idle' | 'loading' | 'success' | 'error'

function SpinnerIcon() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
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
      className="w-5 h-5"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

interface LogButtonProps {
  itemId: number
  itemName: string
  dosesToday?: number
  maxDailyDoses?: number
}

function LogButton({ itemId, itemName, dosesToday, maxDailyDoses }: LogButtonProps) {
  const [logState, setLogState] = useState<LogState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logMutation = useCreateLogEntry(itemId)

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const handleLog = useCallback(() => {
    if (logState !== 'idle') return
    setLogState('loading')
    logMutation.mutate({}, {
      onSuccess: () => {
        setLogState('success')
        timerRef.current = setTimeout(() => setLogState('idle'), 2000)
      },
      onError: (err) => {
        setErrorMsg(err.message || 'Failed to log.')
        setLogState('error')
        timerRef.current = setTimeout(() => { setLogState('idle'); setErrorMsg(null) }, 3000)
      },
    })
  }, [logState, logMutation])

  const fillPercent =
    dosesToday !== undefined && maxDailyDoses !== undefined && maxDailyDoses > 0
      ? Math.min(dosesToday / maxDailyDoses, 1) * 100
      : null

  const atMax = fillPercent !== null && fillPercent >= 100
  const hasDoseTracking = fillPercent !== null

  // Determine overlay color
  const overlayClass =
    logState === 'success'
      ? 'bg-green-500'
      : logState === 'error'
        ? 'bg-cp-danger/20'
        : 'bg-cp-primary'

  // Show full overlay when: non-idle, at max, or no dose tracking
  const showFullOverlay = logState !== 'idle' || atMax || !hasDoseTracking

  return (
    <div>
      {logState === 'error' && errorMsg !== null && (
        <p className="text-xs text-cp-danger mb-1.5" role="alert">{errorMsg}</p>
      )}
      <button
        type="button"
        onClick={handleLog}
        disabled={logState !== 'idle' || atMax}
        aria-label={logState === 'success' ? 'Logged!' : `Log ${itemName}`}
        aria-valuenow={hasDoseTracking ? dosesToday : undefined}
        aria-valuemax={hasDoseTracking ? maxDailyDoses : undefined}
        className={[
          'relative w-full min-h-[44px] overflow-hidden rounded-lg font-medium text-sm transition-colors',
          'bg-cp-surface border border-cp-border',
          (logState !== 'idle' || atMax) ? 'cursor-not-allowed opacity-80' : '',
        ].join(' ')}
      >
        {/* Partial fill layer — dose tracking active, idle, not at max */}
        {hasDoseTracking && !atMax && logState === 'idle' && (
          <span
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 ${overlayClass} transition-[width] duration-300`}
            style={{ width: `${fillPercent}%` }}
          />
        )}
        {/* Full overlay — non-idle, at max, or no dose tracking */}
        {showFullOverlay && (
          <span aria-hidden="true" className={`absolute inset-0 ${overlayClass}`} />
        )}

        {/* Content */}
        <span
          className={[
            'relative flex items-center justify-between px-4 gap-2',
            logState === 'error' ? 'text-cp-danger' : 'text-white',
            // When partial fill, left content may be over muted bg — use cp-text for legibility
            hasDoseTracking && !atMax && logState === 'idle' && fillPercent === 0
              ? 'text-cp-text'
              : '',
          ].join(' ')}
        >
          <span className="flex items-center gap-2">
            {logState === 'loading' && <SpinnerIcon />}
            {logState === 'success' && <CheckIcon />}
            <span>
              {logState === 'idle' && (atMax ? 'Max reached' : 'Log now')}
              {logState === 'loading' && 'Logging…'}
              {logState === 'success' && 'Logged!'}
              {logState === 'error' && 'Retry'}
            </span>
          </span>
          {hasDoseTracking && logState === 'idle' && (
            <span className="text-sm font-semibold opacity-90">
              {dosesToday} / {maxDailyDoses}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}

// --- Log history list ---

interface LogHistoryProps {
  itemId: number
}

function LogHistory({ itemId }: LogHistoryProps) {
  const [page, setPage] = useState(1)
  const { data: entries, isLoading, isError } = useLogEntries(itemId, page)

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 bg-cp-border rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-sm text-cp-danger">Failed to load log history.</p>
  }

  if (entries === undefined || entries.length === 0) {
    return (
      <p className="text-sm text-cp-text-muted text-center py-4">
        {page === 1 ? 'No log entries yet. Tap "Log now" to record your first entry.' : 'No more entries.'}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="bg-cp-surface rounded-lg border border-cp-border px-4 py-3"
        >
          <p className="text-sm font-medium text-cp-text">
            {formatDateTime(entry.logged_at)}
          </p>
          {entry.notes !== null && entry.notes.trim().length > 0 && (
            <p className="text-xs text-cp-text-muted mt-0.5">{entry.notes}</p>
          )}
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        {page > 1 && (
          <button
            type="button"
            onClick={() => setPage((p) => p - 1)}
            className="flex-1 min-h-[44px] rounded-lg border border-cp-border bg-cp-surface text-cp-text text-sm font-medium active:bg-cp-bg transition-colors"
          >
            Previous
          </button>
        )}
        {entries.length === 20 && (
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            className="flex-1 min-h-[44px] rounded-lg border border-cp-border bg-cp-surface text-cp-text text-sm font-medium active:bg-cp-bg transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

// --- Main page ---

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>()
  const itemId = parseInt(id ?? '0', 10)
  const navigate = useNavigate()

  const { data: item, isLoading, isError } = useItem(itemId)
  const deleteMutation = useDeleteItem(itemId)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleArchive = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleConfirmArchive = useCallback(() => {
    setShowConfirm(false)
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate('/'),
    })
  }, [deleteMutation, navigate])

  const handleCancelArchive = useCallback(() => {
    setShowConfirm(false)
  }, [])

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Item" showBack />
        <div className="px-4 py-6 space-y-4 animate-pulse">
          <div className="h-6 bg-cp-border rounded w-1/2" />
          <div className="h-4 bg-cp-border rounded w-1/4" />
          <div className="h-11 bg-cp-border rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || item === undefined) {
    return (
      <div>
        <PageHeader title="Item" showBack />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-cp-danger">Failed to load item.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={item.name} showBack />

      <div className="px-4 py-4 space-y-5">
        {/* Item metadata */}
        <div className="bg-cp-surface rounded-xl border border-cp-border px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-cp-text-muted uppercase tracking-wide">
              {item.category}
            </span>
            {!item.is_active && (
              <span className="text-xs font-medium text-cp-danger px-2 py-0.5 rounded-full bg-cp-danger/10">
                Archived
              </span>
            )}
            <ItemScheduleBadge schedule={item.schedule} />
          </div>
          {item.description !== null && item.description.trim().length > 0 && (
            <p className="text-sm text-cp-text">{item.description}</p>
          )}
        </div>

        {/* Log now */}
        <LogButton
          itemId={item.id}
          itemName={item.name}
          dosesToday={item.doses_today}
          maxDailyDoses={item.max_daily_doses ?? undefined}
        />

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link
            to={`/items/${item.id}/edit`}
            className="flex-1 min-h-[44px] flex items-center justify-center rounded-lg border border-cp-border bg-cp-surface text-cp-text font-medium text-sm active:bg-cp-bg transition-colors"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={handleArchive}
            disabled={deleteMutation.isPending || !item.is_active}
            className={[
              'flex-1 min-h-[44px] rounded-lg font-medium text-sm transition-colors',
              item.is_active
                ? 'border border-cp-danger text-cp-danger active:bg-cp-danger/10'
                : 'border border-cp-border text-cp-text-muted cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            {deleteMutation.isPending ? 'Archiving…' : 'Archive'}
          </button>
        </div>

        {/* Log history */}
        <section>
          <h2 className="text-sm font-semibold text-cp-text mb-3">Log history</h2>
          <LogHistory itemId={item.id} />
        </section>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Archive item"
          message={`Archive "${item.name}"? It will no longer appear on your dashboard, but all log history will be preserved.`}
          confirmLabel="Archive"
          dangerous={true}
          onConfirm={handleConfirmArchive}
          onCancel={handleCancelArchive}
        />
      )}
    </div>
  )
}
