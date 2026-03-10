/**
 * ReportTable — displays log entries as cards on mobile, table on md+ screens.
 *
 * Date/time formatting uses the browser's locale via toLocaleString so the
 * output respects the user's system language and 12/24-hour preference.
 * The UTC timestamp from the backend is parsed as-is — the browser converts
 * it to local time automatically when constructing a Date object from an ISO
 * 8601 string with a Z suffix or explicit offset.
 *
 * Props
 * -----
 * entries   — log entries to display (already fetched by the page)
 * isLoading — when true, shows skeleton rows instead of content
 */

import type { LogEntry } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-10 h-10 text-cp-border mb-3"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <p className="text-sm text-cp-text-muted">
        No entries found for the selected filters.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton rows
// ---------------------------------------------------------------------------

function SkeletonRows() {
  return (
    <>
      {/* Mobile skeletons */}
      <div className="md:hidden space-y-3 animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-cp-surface rounded-xl border border-cp-border p-4 space-y-2"
          >
            <div className="h-4 bg-cp-border rounded w-2/3" />
            <div className="h-3 bg-cp-border rounded w-1/2" />
            <div className="h-3 bg-cp-border rounded w-1/3" />
          </div>
        ))}
      </div>
      {/* Desktop skeleton rows */}
      <div className="hidden md:block animate-pulse">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-4 px-4 py-3 border-b border-cp-border"
          >
            <div className="flex-1 h-4 bg-cp-border rounded" />
            <div className="w-32 h-4 bg-cp-border rounded" />
            <div className="w-24 h-4 bg-cp-border rounded" />
            <div className="w-40 h-4 bg-cp-border rounded" />
          </div>
        ))}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Mobile card view
// ---------------------------------------------------------------------------

function EntryCard({ entry }: { entry: LogEntry }) {
  return (
    <div className="bg-cp-surface rounded-xl border border-cp-border p-4 space-y-1">
      <p className="text-sm font-semibold text-cp-text">{entry.item_name}</p>
      <p className="text-xs text-cp-text-muted">{entry.category}</p>
      <p className="text-xs text-cp-text-muted">{formatDateTime(entry.logged_at)}</p>
      {entry.notes !== null && entry.notes.trim().length > 0 && (
        <p className="text-xs text-cp-text mt-1 italic">{entry.notes}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Desktop table view
// ---------------------------------------------------------------------------

const thCls =
  'px-4 py-3 text-left text-xs font-semibold text-cp-text-muted uppercase tracking-wide whitespace-nowrap'

const tdCls = 'px-4 py-3 text-sm text-cp-text align-top'

function EntryTableRow({ entry }: { entry: LogEntry }) {
  return (
    <tr className="border-b border-cp-border hover:bg-cp-bg transition-colors">
      <td className={tdCls}>{formatDateTime(entry.logged_at)}</td>
      <td className={tdCls + ' font-medium'}>{entry.item_name}</td>
      <td className={tdCls}>{entry.category}</td>
      <td className={tdCls + ' text-cp-text-muted'}>
        {entry.notes !== null && entry.notes.trim().length > 0
          ? entry.notes
          : <span className="text-cp-border">—</span>}
      </td>
    </tr>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ReportTableProps {
  entries: LogEntry[]
  isLoading: boolean
}

export default function ReportTable({ entries, isLoading }: ReportTableProps) {
  if (isLoading) {
    return <SkeletonRows />
  }

  if (entries.length === 0) {
    return <EmptyState />
  }

  return (
    <div>
      {/* Row count */}
      <p className="text-xs text-cp-text-muted mb-3">
        Showing {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </p>

      {/* Mobile: card list */}
      <div className="md:hidden space-y-3">
        {entries.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>

      {/* Desktop: table with sticky header */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-cp-border">
        <table className="w-full min-w-[600px] border-collapse">
          <thead className="bg-cp-surface sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-cp-border">
              <th className={thCls}>Date / Time</th>
              <th className={thCls}>Item</th>
              <th className={thCls}>Category</th>
              <th className={thCls}>Notes</th>
            </tr>
          </thead>
          <tbody className="bg-cp-bg">
            {entries.map((entry) => (
              <EntryTableRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
