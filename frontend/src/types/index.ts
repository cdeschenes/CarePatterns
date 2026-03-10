/**
 * TypeScript interfaces matching CarePatterns backend Pydantic schemas exactly.
 * All datetime strings are ISO 8601 UTC (from the backend).
 * All date strings are YYYY-MM-DD.
 */

export interface Schedule {
  id: number
  item_id: number
  frequency_type: 'once_daily' | 'twice_daily' | 'weekly' | 'custom'
  interval_value: number | null
  interval_unit: 'minutes' | 'hours' | 'days' | 'weeks' | null
  time_of_day: string[]   // "HH:MM" strings, 24-hour
  days_of_week: string[]  // "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun"
  starts_at: string       // ISO 8601 UTC datetime string
}

export interface Item {
  id: number
  name: string
  category: string
  description: string | null
  is_active: boolean
  created_at: string        // ISO 8601 UTC datetime string
  last_logged_at: string | null  // ISO 8601 UTC datetime string, null if never logged
  schedule: Schedule | null
  max_daily_doses: number | null
  doses_today: number
  color: string | null
  sort_order: number | null
}

export interface LogEntry {
  id: number
  item_id: number
  item_name: string
  category: string
  logged_at: string    // ISO 8601 UTC datetime string
  notes: string | null
}

export interface Theme {
  id: number
  name: string
  is_active: boolean
  is_builtin: boolean
  variables: Record<string, string>  // CSS custom property name → value
}

export interface ReminderItem {
  id: number
  name: string
}

export interface PaginatedLogEntries {
  items: LogEntry[]
  page: number
  per_page: number
  total: number
}

export interface ReportFilters {
  item_id?: number
  start_date?: string  // YYYY-MM-DD
  end_date?: string    // YYYY-MM-DD
}

// --- Request body types ---

export interface ItemCreate {
  name: string
  category: string
  description?: string
  max_daily_doses?: number | null
  color?: string | null
}

export interface ItemUpdate {
  name?: string
  category?: string
  description?: string
  is_active?: boolean
  max_daily_doses?: number | null
  color?: string | null
}

export interface ScheduleCreate {
  frequency_type: Schedule['frequency_type']
  interval_value?: number
  interval_unit?: Schedule['interval_unit']
  time_of_day?: string[]
  days_of_week?: string[]
  starts_at?: string
}

export interface ScheduleUpdate {
  frequency_type?: Schedule['frequency_type']
  interval_value?: number
  interval_unit?: Schedule['interval_unit']
  time_of_day?: string[]
  days_of_week?: string[]
  starts_at?: string
}

export interface LogEntryCreate {
  notes?: string
}

export interface ThemeCreate {
  name: string
  variables: Record<string, string>
}
