/**
 * ItemForm — unified create / edit form for items and their optional schedule.
 *
 * Mode detection: if `item` prop is present, form is in edit mode.
 * If `schedule` prop is present, schedule fields are pre-filled.
 *
 * Schedule handling strategy:
 *   - Create mode: if user sets a frequency, a schedule is created via POST
 *   - Edit mode with existing schedule: PATCH to update it, or DELETE if set to None
 *   - Edit mode with no schedule: POST to create one if user sets a frequency
 * The parent page passes the relevant mutations; this component just calls
 * onSubmit with the collected form data and lets the page handle the API calls.
 *
 * Category field:
 *   - Select shows fixed options first
 *   - Choosing "Custom..." reveals a text input for a free-text category
 *   - On edit, if saved category is not in the built-in list, "Custom..." is
 *     pre-selected and the text input is pre-filled
 */

import { type FormEvent, useCallback, useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateItem, useUpdateItem } from '@/api/items'
import { useCreateSchedule, useDeleteSchedule, useUpdateSchedule } from '@/api/schedules'
import type { Item, Schedule, ScheduleCreate } from '@/types'

// --- Constants ---

const BUILTIN_CATEGORIES = ['Medication', 'Procedure', 'Goal', 'Other'] as const

const ITEM_COLORS = [
  { hex: '#F87171', name: 'Coral' },
  { hex: '#FB923C', name: 'Orange' },
  { hex: '#FBBF24', name: 'Amber' },
  { hex: '#4ADE80', name: 'Green' },
  { hex: '#2DD4BF', name: 'Teal' },
  { hex: '#60A5FA', name: 'Blue' },
  { hex: '#818CF8', name: 'Indigo' },
  { hex: '#C084FC', name: 'Purple' },
  { hex: '#F472B6', name: 'Pink' },
  { hex: '#94A3B8', name: 'Slate' },
] as const
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const INTERVAL_UNITS = ['hours', 'days', 'weeks'] as const

type FrequencyType = 'none' | 'once_daily' | 'twice_daily' | 'weekly' | 'custom'

// --- Helpers ---

function isBuiltinCategory(cat: string): boolean {
  return (BUILTIN_CATEGORIES as readonly string[]).includes(cat)
}

function initialCategory(item: Item | undefined): string {
  if (item === undefined) return 'Medication'
  return isBuiltinCategory(item.category) ? item.category : 'custom'
}

function initialCustomCategory(item: Item | undefined): string {
  if (item === undefined) return ''
  return isBuiltinCategory(item.category) ? '' : item.category
}

function initialFrequency(schedule: Schedule | undefined | null): FrequencyType {
  if (schedule === undefined || schedule === null) return 'none'
  return schedule.frequency_type
}

// --- Sub-components ---

interface FieldProps {
  label: string
  htmlFor: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

function Field({ label, htmlFor, error, required, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-cp-text"
      >
        {label}
        {required && <span className="text-cp-danger ml-0.5">*</span>}
      </label>
      {children}
      {error !== undefined && (
        <p className="text-xs text-cp-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-cp-border bg-cp-surface px-3 py-2.5 text-sm text-cp-text placeholder:text-cp-text-muted focus:outline-none focus:ring-2 focus:ring-cp-primary min-h-[44px]'

const selectCls = inputCls + ' appearance-none'

// --- Main form ---

export interface ItemFormProps {
  item?: Item
  schedule?: Schedule | null
}

export default function ItemForm({ item, schedule }: ItemFormProps) {
  const navigate = useNavigate()
  const isEdit = item !== undefined

  // Field IDs for accessibility
  const nameId = useId()
  const categoryId = useId()
  const customCategoryId = useId()
  const descriptionId = useId()
  const frequencyId = useId()
  const intervalValueId = useId()
  const intervalUnitId = useId()
  const maxDailyDosesId = useId()

  // --- Form state ---
  const [color, setColor] = useState<string>(item?.color ?? '#60A5FA')
  const [name, setName] = useState(item?.name ?? '')
  const [categorySelect, setCategorySelect] = useState<string>(
    initialCategory(item),
  )
  const [customCategory, setCustomCategory] = useState<string>(
    initialCustomCategory(item),
  )
  const [description, setDescription] = useState(item?.description ?? '')
  const [trackDailyDoses, setTrackDailyDoses] = useState(
    item?.max_daily_doses != null,
  )
  const [maxDailyDoses, setMaxDailyDoses] = useState<string>(
    item?.max_daily_doses?.toString() ?? '4',
  )
  const [frequency, setFrequency] = useState<FrequencyType>(
    initialFrequency(schedule),
  )
  // Once-daily and twice-daily use up to 2 time-of-day entries
  const [timeOfDay, setTimeOfDay] = useState<[string, string]>(() => {
    const tod = schedule?.time_of_day ?? []
    return [tod[0] ?? '09:00', tod[1] ?? '21:00']
  })
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>(
    schedule?.days_of_week ?? [],
  )
  const [weeklyTime, setWeeklyTime] = useState(
    schedule?.time_of_day[0] ?? '09:00',
  )
  const [intervalValue, setIntervalValue] = useState<string>(
    schedule?.interval_value?.toString() ?? '8',
  )
  const [intervalUnit, setIntervalUnit] = useState<
    'hours' | 'days' | 'weeks'
  >(
    (schedule?.interval_unit as 'hours' | 'days' | 'weeks' | null) ?? 'hours',
  )

  // --- Validation errors ---
  const [errors, setErrors] = useState<Record<string, string>>({})

  // --- Mutations ---
  const createItem = useCreateItem()
  const updateItem = useUpdateItem(item?.id ?? 0)
  const createSchedule = useCreateSchedule(item?.id ?? 0)
  const updateSchedule = useUpdateSchedule(item?.id ?? 0)
  const deleteSchedule = useDeleteSchedule(item?.id ?? 0)

  const isSubmitting =
    createItem.isPending ||
    updateItem.isPending ||
    createSchedule.isPending ||
    updateSchedule.isPending ||
    deleteSchedule.isPending

  // Re-initialise fields if props change (e.g. data loads after mount in edit mode)
  useEffect(() => {
    if (item !== undefined) {
      setName(item.name)
      setCategorySelect(initialCategory(item))
      setCustomCategory(initialCustomCategory(item))
      setDescription(item.description ?? '')
      setTrackDailyDoses(item.max_daily_doses != null)
      setMaxDailyDoses(item.max_daily_doses?.toString() ?? '4')
      setColor(item.color ?? '#60A5FA')
    }
  }, [item])


  useEffect(() => {
    if (schedule !== undefined) {
      setFrequency(initialFrequency(schedule))
      if (schedule !== null) {
        setTimeOfDay([
          schedule.time_of_day[0] ?? '09:00',
          schedule.time_of_day[1] ?? '21:00',
        ])
        setDaysOfWeek(schedule.days_of_week)
        setWeeklyTime(schedule.time_of_day[0] ?? '09:00')
        setIntervalValue(schedule.interval_value?.toString() ?? '8')
        setIntervalUnit(
          (schedule.interval_unit as 'hours' | 'days' | 'weeks' | null) ?? 'hours',
        )
      }
    }
  }, [schedule])

  // --- Derived values ---
  const effectiveCategory =
    categorySelect === 'custom' ? customCategory.trim() : categorySelect

  // --- Validation ---
  function validate(): boolean {
    const next: Record<string, string> = {}

    if (name.trim().length === 0) {
      next.name = 'Name is required.'
    } else if (name.trim().length > 100) {
      next.name = 'Name must be 100 characters or fewer.'
    }

    if (categorySelect === 'custom' && customCategory.trim().length === 0) {
      next.customCategory = 'Custom category must not be empty.'
    }

    if (description.trim().length > 500) {
      next.description = 'Description must be 500 characters or fewer.'
    }

    if (frequency === 'weekly' && daysOfWeek.length === 0) {
      next.daysOfWeek = 'Select at least one day.'
    }

    if (frequency === 'custom') {
      const parsed = parseInt(intervalValue, 10)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        next.intervalValue = 'Enter a whole number greater than 0.'
      }
    }

    if (trackDailyDoses) {
      const parsed = parseInt(maxDailyDoses, 10)
      if (!Number.isFinite(parsed) || parsed < 1 || parsed > 99) {
        next.maxDailyDoses = 'Enter a number between 1 and 99.'
      }
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  // --- Schedule payload builder ---
  function buildSchedulePayload(): ScheduleCreate | null {
    if (frequency === 'none') return null

    const base: ScheduleCreate = { frequency_type: frequency }

    if (frequency === 'once_daily') {
      base.time_of_day = [timeOfDay[0]]
    } else if (frequency === 'twice_daily') {
      base.time_of_day = [timeOfDay[0], timeOfDay[1]]
    } else if (frequency === 'weekly') {
      base.days_of_week = daysOfWeek
      base.time_of_day = [weeklyTime]
    } else if (frequency === 'custom') {
      base.interval_value = parseInt(intervalValue, 10)
      base.interval_unit = intervalUnit
    }

    return base
  }

  // --- Submit handler ---
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!validate()) return

      const schedulePayload = buildSchedulePayload()

      try {
        const effectiveMaxDailyDoses = trackDailyDoses
          ? parseInt(maxDailyDoses, 10) || null
          : null

      if (!isEdit) {
          // Create item
          const created = await createItem.mutateAsync({
            name: name.trim(),
            category: effectiveCategory,
            ...(description.trim() ? { description: description.trim() } : {}),
            max_daily_doses: effectiveMaxDailyDoses,
            color,
          })

          // Create schedule if one was set (need the new item id)
          if (schedulePayload !== null) {
            // Use a direct API call here because the hook was initialised with id=0
            // before we had the real item id. The createSchedule hook for the new id
            // is not available here. The page re-routes immediately after so this
            // is a one-shot fire-and-forget with the real id from `created`.
            const { default: client } = await import('@/api/client')
            await client.post(`/api/v1/items/${created.id}/schedule`, schedulePayload)
          }

          navigate('/')
        } else {
          // Update item
          await updateItem.mutateAsync({
            name: name.trim(),
            category: effectiveCategory,
            description: description.trim() || undefined,
            max_daily_doses: effectiveMaxDailyDoses,
            color,
          })

          // Handle schedule changes
          const hasExistingSchedule = schedule !== null && schedule !== undefined
          if (schedulePayload === null && hasExistingSchedule) {
            // User cleared the schedule
            await deleteSchedule.mutateAsync()
          } else if (schedulePayload !== null && hasExistingSchedule) {
            // Update existing schedule
            await updateSchedule.mutateAsync(schedulePayload)
          } else if (schedulePayload !== null && !hasExistingSchedule) {
            // Create a new schedule on the existing item
            await createSchedule.mutateAsync(schedulePayload)
          }

          navigate(`/items/${item.id}`)
        }
      } catch {
        // Errors are surfaced via mutation.isError; no additional handling needed here
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name, categorySelect, customCategory, description, frequency, timeOfDay,
     daysOfWeek, weeklyTime, intervalValue, intervalUnit, isEdit,
     trackDailyDoses, maxDailyDoses, color],
  )

  // --- Toggle day of week ---
  function toggleDay(day: string) {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  // --- Submission error ---
  const submitError =
    createItem.error ?? updateItem.error ?? createSchedule.error ??
    updateSchedule.error ?? deleteSchedule.error

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="space-y-5 px-4 py-4">
      {/* Name */}
      <Field label="Name" htmlFor={nameId} error={errors.name} required>
        <input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Metformin, Physical therapy, Daily walk"
          maxLength={100}
          autoComplete="off"
          autoCapitalize="words"
          className={inputCls}
        />
      </Field>

      {/* Category */}
      <Field label="Category" htmlFor={categoryId}>
        <select
          id={categoryId}
          value={categorySelect}
          onChange={(e) => setCategorySelect(e.target.value)}
          className={selectCls}
        >
          {BUILTIN_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="custom">Custom…</option>
        </select>
      </Field>

      {/* Custom category text input */}
      {categorySelect === 'custom' && (
        <Field
          label="Custom category"
          htmlFor={customCategoryId}
          error={errors.customCategory}
          required
        >
          <input
            id={customCategoryId}
            type="text"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Enter a category name"
            maxLength={255}
            autoComplete="off"
            autoCapitalize="words"
            className={inputCls}
          />
        </Field>
      )}

      {/* Color picker */}
      <Field label="Color" htmlFor="color-picker">
        <div className="flex gap-3 flex-wrap pt-1">
          {ITEM_COLORS.map(({ hex, name: colorName }) => (
            <button
              key={hex}
              type="button"
              aria-label={colorName}
              onClick={() => setColor(hex)}
              className={[
                'w-10 h-10 rounded-full transition-transform',
                color === hex ? 'ring-2 ring-offset-2 ring-cp-primary scale-110' : '',
              ].join(' ')}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </Field>

      {/* Description */}
      <Field label="Description" htmlFor={descriptionId} error={errors.description}>
        <textarea
          id={descriptionId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes about this item"
          maxLength={500}
          rows={3}
          className={
            'w-full rounded-lg border border-cp-border bg-cp-surface px-3 py-2.5 text-sm text-cp-text placeholder:text-cp-text-muted focus:outline-none focus:ring-2 focus:ring-cp-primary resize-none'
          }
        />
        <p className="text-right text-xs text-cp-text-muted">
          {description.length}/500
        </p>
      </Field>

      {/* Daily dose limit */}
      <div className="space-y-3 border-t border-cp-border pt-4">
        <h2 className="text-sm font-semibold text-cp-text">Daily dose limit (optional)</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={trackDailyDoses}
            onChange={(e) => setTrackDailyDoses(e.target.checked)}
            className="w-5 h-5 accent-cp-primary"
          />
          <span className="text-sm text-cp-text">Track daily dose limit</span>
        </label>
        {trackDailyDoses && (
          <Field
            label="Daily dose limit"
            htmlFor={maxDailyDosesId}
            error={errors.maxDailyDoses}
          >
            <input
              id={maxDailyDosesId}
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              step={1}
              value={maxDailyDoses}
              onChange={(e) => setMaxDailyDoses(e.target.value)}
              placeholder="e.g. 4"
              className={inputCls}
            />
            <p className="text-xs text-cp-text-muted mt-1">
              e.g. 4 for a medication taken every 6 hours
            </p>
          </Field>
        )}
      </div>

      {/* Schedule section */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-cp-text border-t border-cp-border pt-4">
          Schedule (optional)
        </h2>

        <Field label="Frequency" htmlFor={frequencyId}>
          <select
            id={frequencyId}
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as FrequencyType)}
            className={selectCls}
          >
            <option value="none">No schedule</option>
            <option value="once_daily">Once daily</option>
            <option value="twice_daily">Twice daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom interval</option>
          </select>
        </Field>

        {/* Once daily */}
        {frequency === 'once_daily' && (
          <Field label="Time of day" htmlFor={`${nameId}-tod0`}>
            <input
              id={`${nameId}-tod0`}
              type="time"
              value={timeOfDay[0]}
              onChange={(e) =>
                setTimeOfDay(([, t1]) => [e.target.value, t1])
              }
              className={inputCls}
            />
          </Field>
        )}

        {/* Twice daily */}
        {frequency === 'twice_daily' && (
          <div className="space-y-3">
            <Field label="First dose time" htmlFor={`${nameId}-tod0`}>
              <input
                id={`${nameId}-tod0`}
                type="time"
                value={timeOfDay[0]}
                onChange={(e) =>
                  setTimeOfDay(([, t1]) => [e.target.value, t1])
                }
                className={inputCls}
              />
            </Field>
            <Field label="Second dose time" htmlFor={`${nameId}-tod1`}>
              <input
                id={`${nameId}-tod1`}
                type="time"
                value={timeOfDay[1]}
                onChange={(e) =>
                  setTimeOfDay(([t0]) => [t0, e.target.value])
                }
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Weekly */}
        {frequency === 'weekly' && (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-cp-text mb-2">
                Days<span className="text-cp-danger ml-0.5">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={daysOfWeek.includes(day)}
                    className={[
                      'min-w-[44px] min-h-[44px] px-3 rounded-lg text-sm font-medium transition-colors',
                      daysOfWeek.includes(day)
                        ? 'bg-cp-primary text-white'
                        : 'bg-cp-surface border border-cp-border text-cp-text active:bg-cp-bg',
                    ].join(' ')}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {errors.daysOfWeek !== undefined && (
                <p className="text-xs text-cp-danger mt-1" role="alert">
                  {errors.daysOfWeek}
                </p>
              )}
            </div>
            <Field label="Time of day" htmlFor={`${nameId}-weekly-time`}>
              <input
                id={`${nameId}-weekly-time`}
                type="time"
                value={weeklyTime}
                onChange={(e) => setWeeklyTime(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Custom interval */}
        {frequency === 'custom' && (
          <div className="flex gap-3 items-start">
            <Field
              label="Every"
              htmlFor={intervalValueId}
              error={errors.intervalValue}
            >
              <input
                id={intervalValueId}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={intervalValue}
                onChange={(e) => setIntervalValue(e.target.value)}
                className={inputCls + ' w-24'}
              />
            </Field>
            <Field label="Unit" htmlFor={intervalUnitId}>
              <select
                id={intervalUnitId}
                value={intervalUnit}
                onChange={(e) =>
                  setIntervalUnit(e.target.value as 'hours' | 'days' | 'weeks')
                }
                className={selectCls}
              >
                {INTERVAL_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      {/* API error */}
      {submitError !== null && submitError !== undefined && (
        <p className="text-sm text-cp-danger" role="alert">
          {submitError.message || 'Something went wrong. Please try again.'}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 pb-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex-1 min-h-[44px] rounded-lg border border-cp-border bg-cp-surface text-cp-text font-medium text-sm active:bg-cp-bg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            'flex-1 min-h-[44px] rounded-lg bg-cp-primary text-white font-medium text-sm',
            'active:bg-cp-accent transition-colors',
            isSubmitting ? 'opacity-60 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {isSubmitting
            ? 'Saving…'
            : isEdit
              ? 'Save changes'
              : 'Save item'}
        </button>
      </div>
    </form>
  )
}
