/**
 * ItemCard — single item row on the dashboard.
 *
 * Layout: horizontal progress-fill card.
 *   - Gray base layer
 *   - Color fill grows left→right based on doses_today / max_daily_doses
 *   - At max doses: fill darkens (brightness filter); logging still allowed
 *   - No max_daily_doses: first log → 100% fill; 0 logs → empty
 *   - Left side (tap): navigate to item detail
 *   - Right side (tap): log a dose
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateLogEntry } from '@/api/logEntries'
import type { Item } from '@/types'

// --- Icons ---

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

function SpinnerIcon() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
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

function GripIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-4 h-4"
      aria-hidden="true"
    >
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  )
}

// --- Log button state machine ---

type LogState = 'idle' | 'loading' | 'success' | 'error'

interface ItemCardProps {
  item: Item
  dragHandleProps?: Record<string, unknown>
}

export default function ItemCard({ item, dragHandleProps }: ItemCardProps) {
  const navigate = useNavigate()
  const [logState, setLogState] = useState<LogState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logMutation = useCreateLogEntry(item.id)

  // Clear any pending reset timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current)
    }
  }, [])

  const handleLog = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (logState !== 'idle') return

      setLogState('loading')
      setErrorMsg(null)

      logMutation.mutate(
        {},
        {
          onSuccess: () => {
            setLogState('success')
            resetTimerRef.current = setTimeout(() => setLogState('idle'), 2000)
          },
          onError: (err) => {
            const msg =
              err instanceof Error ? err.message : 'Failed to log. Try again.'
            setErrorMsg(msg)
            setLogState('error')
            resetTimerRef.current = setTimeout(() => {
              setLogState('idle')
              setErrorMsg(null)
            }, 3000)
          },
        },
      )
    },
    [logState, logMutation],
  )

  // Progress calculation
  const fillPct =
    item.max_daily_doses !== null
      ? Math.min(item.doses_today / item.max_daily_doses, 1) * 100
      : item.doses_today > 0
        ? 100
        : 0

  const atMax =
    item.max_daily_doses !== null && item.doses_today >= item.max_daily_doses

  const cardColor = item.color ?? '#94A3B8'

  return (
    <div>
      {errorMsg !== null && logState === 'error' && (
        <p className="text-xs text-cp-danger mb-1 px-1" role="alert">
          {errorMsg}
        </p>
      )}

      <div className="relative rounded-2xl overflow-hidden h-20 shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
        {/* Gray base */}
        <div className="absolute inset-0 bg-cp-surface" />

        {/* Color fill — grows left→right */}
        <div
          className="absolute inset-0 transition-all duration-500 ease-out"
          style={{
            backgroundColor: cardColor,
            width: `${fillPct}%`,
            filter: atMax ? 'brightness(0.65)' : 'none',
          }}
        />

        {/* Content row */}
        <div className="relative z-10 flex items-stretch h-full">
          {/* Drag handle */}
          {dragHandleProps !== undefined && (
            <button
              type="button"
              className="flex items-center justify-center pl-3 pr-1 touch-none text-cp-text-muted"
              aria-label="Drag to reorder"
              {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            >
              <GripIcon />
            </button>
          )}
          {/* Left: item info → tap to navigate */}
          <button
            type="button"
            onClick={() => navigate(`/items/${item.id}`)}
            className="flex-1 flex flex-col justify-center px-4 text-left"
          >
            <span className="text-sm font-bold text-cp-text leading-tight truncate uppercase tracking-wide">
              {item.name}
            </span>
            <span className="text-xs text-cp-text-muted mt-0.5">{item.category}</span>
          </button>

          {/* Right: count + log button */}
          <button
            type="button"
            onClick={handleLog}
            disabled={logState !== 'idle'}
            aria-label={atMax ? `Max reached for ${item.name}` : `Log ${item.name}`}
            className="flex items-center justify-center gap-1 pr-5 pl-3 min-w-[64px]"
          >
            {logState === 'loading' && <SpinnerIcon />}
            {logState === 'success' && <CheckIcon />}
            {logState !== 'loading' && logState !== 'success' && (
              <>
                <span className="text-2xl font-bold text-cp-text tabular-nums">
                  {item.doses_today}
                </span>
                {atMax && <CheckIcon />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
