/**
 * ItemScheduleBadge — compact inline schedule summary shown on item cards.
 *
 * Returns null when the item has no schedule (renders nothing).
 * Text is intentionally terse to fit on a single line in a card context.
 */

import type { Schedule } from '@/types'

interface ItemScheduleBadgeProps {
  schedule: Schedule | null
}

function summariseSchedule(schedule: Schedule): string {
  switch (schedule.frequency_type) {
    case 'once_daily':
      return 'Daily'
    case 'twice_daily':
      return '2× Daily'
    case 'weekly': {
      const days = schedule.days_of_week
      if (days.length === 0) return 'Weekly'
      if (days.length <= 3) return days.join(', ')
      return `${days.length}× / week`
    }
    case 'custom': {
      const val = schedule.interval_value
      const unit = schedule.interval_unit
      if (val === null || unit === null) return 'Custom'
      // Trim trailing 's' for singular
      const unitLabel = val === 1 ? unit.replace(/s$/, '') : unit
      return `Every ${val} ${unitLabel}`
    }
  }
}

export default function ItemScheduleBadge({ schedule }: ItemScheduleBadgeProps) {
  if (schedule === null) return null

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cp-primary/10 text-cp-primary">
      {summariseSchedule(schedule)}
    </span>
  )
}
