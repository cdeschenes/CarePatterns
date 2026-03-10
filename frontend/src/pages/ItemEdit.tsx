/**
 * ItemEdit — fetches item and its schedule, then renders ItemForm in edit mode.
 *
 * useSchedule returns an error on 404 (no schedule) which is the valid "no
 * schedule" state. We treat that case as schedule=null rather than an error.
 */

import { useParams } from 'react-router-dom'
import { useItem } from '@/api/items'
import { useSchedule } from '@/api/schedules'
import PageHeader from '@/components/layout/PageHeader'
import ItemForm from '@/components/items/ItemForm'

function isAxios404(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { status?: number } }).response?.status === 404
  )
}

export default function ItemEdit() {
  const { id } = useParams<{ id: string }>()
  const itemId = parseInt(id ?? '0', 10)

  const { data: item, isLoading: itemLoading, isError: itemError } = useItem(itemId)
  const {
    data: schedule,
    isLoading: scheduleLoading,
    error: scheduleError,
  } = useSchedule(itemId)

  const isLoading = itemLoading || scheduleLoading
  // 404 on schedule is not a real error — item just has no schedule
  const scheduleNotFound = isAxios404(scheduleError)
  const resolvedSchedule = scheduleNotFound ? null : (schedule ?? null)

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Edit Item" showBack />
        <div className="px-4 py-8 space-y-4 animate-pulse">
          <div className="h-5 bg-cp-border rounded w-1/3" />
          <div className="h-11 bg-cp-border rounded-lg" />
          <div className="h-5 bg-cp-border rounded w-1/4" />
          <div className="h-11 bg-cp-border rounded-lg" />
          <div className="h-5 bg-cp-border rounded w-1/3" />
          <div className="h-24 bg-cp-border rounded-lg" />
        </div>
      </div>
    )
  }

  if (itemError || item === undefined) {
    return (
      <div>
        <PageHeader title="Edit Item" showBack />
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-cp-danger">Failed to load item.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={`Edit: ${item.name}`} showBack />
      <ItemForm item={item} schedule={resolvedSchedule} />
    </div>
  )
}
