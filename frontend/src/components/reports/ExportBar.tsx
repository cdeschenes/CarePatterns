/**
 * ExportBar — CSV download button and email share button.
 *
 * Download
 * --------
 * Calls downloadCsv(filters) from api/reports.ts, which fetches the CSV
 * blob from the backend and triggers a browser download via object URL.
 * The button shows a loading state while the fetch is in progress.
 *
 * Email share
 * -----------
 * Constructs a mailto: link with a plain-text body. mailto: cannot attach
 * files — the UI makes this explicit with a note below the button.
 * The link is opened with window.open so it works consistently on mobile
 * without navigating away from the page.
 *
 * Disabled state
 * --------------
 * Both buttons are visually disabled (and aria-disabled) when there is
 * nothing to export (no entries, or no report run yet). The `disabled`
 * HTML attribute is NOT used because it suppresses tooltips on mobile and
 * prevents click handlers from firing (which we need to be able to show
 * a hint if needed in future). Instead, clicks are no-op'd in the handler
 * when disabled.
 *
 * Props
 * -----
 * filters   — current active filters (from Reports page state)
 * entries   — current result set (needed to derive disabled state)
 * isLoading — true while the report query is running
 */

import { useCallback, useState } from 'react'
import { downloadCsv } from '@/api/reports'
import type { LogEntry, ReportFilters } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildMailtoHref(): string {
  const subject = 'CarePatterns Export'
  const body = [
    'Please find the CarePatterns data export attached.',
    '',
    'To attach: download the CSV first using the Download button in the app,',
    'then attach it to this email.',
  ].join('\n')

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function DownloadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 flex-shrink-0"
      aria-hidden="true"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="w-4 h-4 animate-spin flex-shrink-0"
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
// Main component
// ---------------------------------------------------------------------------

interface ExportBarProps {
  filters: ReportFilters
  entries: LogEntry[]
  isLoading: boolean
}

export default function ExportBar({ filters, entries, isLoading }: ExportBarProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Buttons are inactive when: no entries returned, or report still loading.
  // The parent (Reports.tsx) only renders ExportBar after hasRunReport=true,
  // so we do not need to guard against the "no report run yet" case here.
  const noEntries = entries.length === 0
  const isDisabled = noEntries || isLoading

  const handleDownload = useCallback(async () => {
    if (isDisabled || isDownloading) return

    setIsDownloading(true)
    setDownloadError(null)

    try {
      await downloadCsv(filters)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Download failed. Try again.'
      setDownloadError(msg)
    } finally {
      setIsDownloading(false)
    }
  }, [isDisabled, isDownloading, filters])

  const handleEmail = useCallback(() => {
    if (isDisabled) return
    window.open(buildMailtoHref(), '_blank', 'noopener,noreferrer')
  }, [isDisabled])

  const disabledCls = 'opacity-50 cursor-not-allowed'
  const baseBtnCls =
    'flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-lg font-medium text-sm transition-colors'

  return (
    <div className="bg-cp-surface rounded-xl border border-cp-border p-4 space-y-3">
      <p className="text-xs font-semibold text-cp-text-muted uppercase tracking-wide">
        Export
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        {/* Download CSV */}
        <button
          type="button"
          onClick={() => void handleDownload()}
          aria-disabled={isDisabled || isDownloading}
          aria-label="Download entries as CSV file"
          className={[
            baseBtnCls,
            'flex-1 bg-cp-primary text-white active:bg-cp-accent',
            isDisabled || isDownloading ? disabledCls : '',
          ].join(' ')}
        >
          {isDownloading ? <SpinnerIcon /> : <DownloadIcon />}
          <span>{isDownloading ? 'Downloading…' : 'Download CSV'}</span>
        </button>

        {/* Share via Email */}
        <button
          type="button"
          onClick={handleEmail}
          aria-disabled={isDisabled}
          aria-label="Open email client to share export"
          className={[
            baseBtnCls,
            'flex-1 border border-cp-border bg-cp-bg text-cp-text active:bg-cp-surface',
            isDisabled ? disabledCls : '',
          ].join(' ')}
        >
          <MailIcon />
          <span>Share via Email</span>
        </button>
      </div>

      {/* Download error */}
      {downloadError !== null && (
        <p className="text-xs text-cp-danger" role="alert">
          {downloadError}
        </p>
      )}

      {/* Email disclaimer */}
      <p className="text-xs text-cp-text-muted leading-relaxed">
        Email clients cannot auto-attach files. Download the CSV first using the
        button above, then attach it manually in your mail app.
      </p>

      {/* Hint when no entries */}
      {noEntries && !isLoading && (
        <p className="text-xs text-cp-text-muted">
          No entries to export for the current filters.
        </p>
      )}
    </div>
  )
}
