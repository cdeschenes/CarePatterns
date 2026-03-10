/**
 * ItemList — dashboard item list with skeleton loading, empty, and error states.
 * Supports drag-to-reorder via @dnd-kit/sortable.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useItems, useReorderItems } from '@/api/items'
import ItemCard from '@/components/items/ItemCard'
import type { Item } from '@/types'

// --- Skeleton card for loading state ---

function SkeletonCard() {
  return (
    <div className="h-20 rounded-2xl bg-cp-surface animate-pulse shadow-[0_2px_12px_rgba(0,0,0,0.2)]" />
  )
}

// --- Empty state ---

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-cp-primary/10 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8 text-cp-primary"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-cp-text mb-1">
        No items yet
      </h2>
      <p className="text-sm text-cp-text-muted mb-6">
        Add a medication, procedure, goal, or any habit you want to track.
      </p>
      <Link
        to="/items/new"
        className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-cp-primary text-white font-medium text-sm active:bg-cp-accent transition-colors"
      >
        Add your first item
      </Link>
    </div>
  )
}

// --- Error state ---

interface ErrorStateProps {
  onRetry: () => void
}

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm text-cp-danger mb-4">
        Failed to load items. Check your connection and try again.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-lg bg-cp-surface border border-cp-border text-cp-text font-medium text-sm active:bg-cp-bg transition-colors"
      >
        Retry
      </button>
    </div>
  )
}

// --- Sortable item wrapper ---

function SortableItemCard({ item }: { item: Item }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <ItemCard item={item} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

// --- Main component ---

export default function ItemList() {
  const { data: items, isLoading, isError, refetch } = useItems()
  const [orderedItems, setOrderedItems] = useState<Item[]>([])
  const reorderMutation = useReorderItems()

  useEffect(() => {
    if (items !== undefined) {
      setOrderedItems(items)
    }
  }, [items])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over === null || active.id === over.id) return

    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id)
      const newIndex = prev.findIndex((item) => item.id === over.id)
      const next = arrayMove(prev, oldIndex, newIndex)
      reorderMutation.mutate(next.map((item) => item.id))
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="py-4 space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (isError) {
    return <ErrorState onRetry={() => void refetch()} />
  }

  if (orderedItems.length === 0) {
    return <EmptyState />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedItems.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="py-4 space-y-3">
          {orderedItems.map((item) => (
            <SortableItemCard key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
