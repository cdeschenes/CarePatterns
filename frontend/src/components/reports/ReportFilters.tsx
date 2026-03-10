/**
 * ReportFilters — item selector + date range inputs + run/clear actions.
 *
 * Validation: end date must not be before start date. Error shown inline;
 * "Run report" is blocked until the date range is valid or incomplete.
 *
 * "All items" is the default selection (item_id left undefined in filters).
 * Date inputs are optional — omitting either end applies no boundary on that side.
 *
 * Props
 * -----
 * onFilter — called with a ReportFilters object when the user runs or clears.
 */

import { useId, useState } from 'react'
import { useItems } from '@/api/items'
import type { ReportFilters } from '@/types'

const inputCls =
  'w-full rounded-lg border border-cp-border bg-cp-surface px-3 py-2.5 ' +
  'text-sm text-cp-text placeholder:text-cp-text-muted ' +
  'focus:outline-none focus:ring-2 focus:ring-cp-primary min-h-[44px]'

const selectCls = inputCls + ' appearance-none'

interface ReportFiltersProps {
  onFilter: (filters: ReportFilters) => void
}

export default function ReportFilters({ onFilter }: ReportFiltersProps) {
  const itemSelectId = useId()
  const startDateId = useId()
  const endDateId = useId()

  const { data: items } = useItems()

  const [itemId, setItemId] = useState<string>('')       // '' means all items
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [dateError, setDateError] = useState<string | null>(null)

  function validateDates(start: string, end: string): string | null {
    if (start.length > 0 && end.length > 0 && end < start) {
      return 'End date must not be before start date.'
    }
    return null
  }

  function handleStartDate(value: string) {
    setStartDate(value)
    setDateError(validateDates(value, endDate))
  }

  function handleEndDate(value: string) {
    setEndDate(value)
    setDateError(validateDates(startDate, value))
  }

  function buildFilters(): ReportFilters {
    const filters: ReportFilters = {}
    if (itemId !== '') filters.item_id = parseInt(itemId, 10)
    if (startDate !== '') filters.start_date = startDate
    if (endDate !== '') filters.end_date = endDate
    return filters
  }

  function handleRun() {
    const err = validateDates(startDate, endDate)
    if (err !== null) {
      setDateError(err)
      return
    }
    onFilter(buildFilters())
  }

  function handleClear() {
    setItemId('')
    setStartDate('')
    setEndDate('')
    setDateError(null)
    onFilter({})
  }

  const hasDateError = dateError !== null

  return (
    <div className="bg-cp-surface rounded-xl border border-cp-border p-4 space-y-4">
      {/* Item selector */}
      <div className="space-y-1">
        <label
          htmlFor={itemSelectId}
          className="block text-sm font-medium text-cp-text"
        >
          Item
        </label>
        <select
          id={itemSelectId}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
          className={selectCls}
        >
          <option value="">All items</option>
          {(items ?? []).map((item) => (
            <option key={item.id} value={String(item.id)}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            htmlFor={startDateId}
            className="block text-sm font-medium text-cp-text"
          >
            From
          </label>
          <input
            id={startDateId}
            type="date"
            value={startDate}
            onChange={(e) => handleStartDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor={endDateId}
            className="block text-sm font-medium text-cp-text"
          >
            To
          </label>
          <input
            id={endDateId}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => handleEndDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Date validation error */}
      {hasDateError && (
        <p className="text-xs text-cp-danger" role="alert">
          {dateError}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 min-h-[44px] rounded-lg border border-cp-border bg-cp-bg text-cp-text font-medium text-sm active:bg-cp-surface transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleRun}
          disabled={hasDateError}
          aria-disabled={hasDateError}
          className={[
            'flex-1 min-h-[44px] rounded-lg font-medium text-sm transition-colors',
            hasDateError
              ? 'bg-cp-border text-cp-text-muted cursor-not-allowed'
              : 'bg-cp-primary text-white active:bg-cp-accent',
          ].join(' ')}
        >
          Run report
        </button>
      </div>
    </div>
  )
}
