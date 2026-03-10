/**
 * Dashboard — main landing page showing all active items.
 *
 * Minimal header with date + title. ReminderModal is rendered as an overlay
 * when there are outstanding scheduled items.
 */

import ItemList from '@/components/items/ItemList'
import ReminderModal from '@/components/reminders/ReminderModal'
import { useReminders } from '@/hooks/useReminders'

export default function Dashboard() {
  const { outstanding, dismiss } = useReminders()
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* Minimal header */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-cp-text-muted text-xs font-medium tracking-wide uppercase">{today}</p>
        <h1 className="text-cp-text text-2xl font-bold mt-0.5">My Items</h1>
      </div>

      <div className="px-4 pt-1">
        <ItemList />
      </div>

      {outstanding.length > 0 && (
        <ReminderModal items={outstanding} onDismiss={dismiss} />
      )}
    </div>
  )
}
