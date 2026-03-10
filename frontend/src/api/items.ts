/**
 * React Query hooks for Item CRUD operations.
 *
 * Query key conventions:
 *   ['items']        — list of all active items
 *   ['items', id]    — single item by id
 *
 * All mutations invalidate ['items'] so the list re-fetches automatically.
 * Update and delete also invalidate the specific item key.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import client from '@/api/client'
import type { Item, ItemCreate, ItemUpdate } from '@/types'

// --- Queries ---

export function useItems() {
  return useQuery<Item[]>({
    queryKey: ['items'],
    queryFn: async () => {
      const { data } = await client.get<Item[]>('/api/v1/items')
      return data
    },
  })
}

export function useItem(id: number) {
  return useQuery<Item>({
    queryKey: ['items', id],
    queryFn: async () => {
      const { data } = await client.get<Item>(`/api/v1/items/${id}`)
      return data
    },
  })
}

// --- Mutations ---

export function useCreateItem() {
  const queryClient = useQueryClient()
  return useMutation<Item, Error, ItemCreate>({
    mutationFn: async (body) => {
      const { data } = await client.post<Item>('/api/v1/items', body)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useUpdateItem(id: number) {
  const queryClient = useQueryClient()
  return useMutation<Item, Error, ItemUpdate>({
    mutationFn: async (body) => {
      const { data } = await client.patch<Item>(`/api/v1/items/${id}`, body)
      return data
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['items', id] })
    },
  })
}

export function useReorderItems() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, number[]>({
    mutationFn: async (orderedIds) => {
      await client.post('/api/v1/items/reorder', { ordered_ids: orderedIds })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useDeleteItem(id: number) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      await client.delete(`/api/v1/items/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['items'] })
      void queryClient.invalidateQueries({ queryKey: ['items', id] })
    },
  })
}
