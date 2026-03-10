/**
 * ConfirmDialog — reusable themed confirmation modal.
 *
 * Behaviour
 * ----------
 * - Backdrop click calls onCancel.
 * - Escape key calls onCancel.
 * - Focus is trapped inside the panel while open.
 * - Focus starts on the Cancel button (safer default for destructive actions).
 * - Animate in via CSS transition (slide-up + fade); caller unmounts on close.
 *
 * Props
 * -----
 * title        — dialog heading
 * message      — body copy
 * confirmLabel — confirm button text (default "Confirm")
 * cancelLabel  — cancel button text (default "Cancel")
 * dangerous    — when true, confirm button uses bg-cp-danger (default false)
 * onConfirm    — called when user taps the confirm button
 * onCancel     — called when user cancels (backdrop, Escape, cancel button)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

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
// ConfirmDialog
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  dangerous?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  dangerous = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  // Trigger the CSS transition after first paint
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Focus the Cancel button on mount (safer default for destructive actions)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Keyboard: Escape to cancel, Tab trap
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
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
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleBackdropClick = useCallback(() => {
    onCancel()
  }, [onCancel])

  const titleId = 'confirm-dialog-title'

  return (
    <div
      className={[
        'fixed inset-0 z-50 flex items-center justify-center px-4',
        'transition-opacity duration-200',
        mounted ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      aria-hidden="true"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className={[
          'w-full max-w-sm',
          'bg-cp-surface rounded-2xl shadow-xl',
          'transition-transform duration-200',
          mounted ? 'translate-y-0' : 'translate-y-8',
        ].join(' ')}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <h2 id={titleId} className="text-base font-semibold text-cp-text">
            {title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-5 pb-5">
          <p className="text-sm text-cp-text-muted">{message}</p>
        </div>

        {/* Footer — stacked buttons, mobile-friendly */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'w-full min-h-[44px] rounded-lg font-medium text-sm text-white transition-colors',
              dangerous
                ? 'bg-cp-danger active:opacity-90'
                : 'bg-cp-primary active:bg-cp-accent',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="w-full min-h-[44px] rounded-lg border border-cp-border bg-cp-surface text-cp-text font-medium text-sm active:bg-cp-bg transition-colors"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
