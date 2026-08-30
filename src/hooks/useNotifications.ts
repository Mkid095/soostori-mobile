// React hook for notifications — wraps db-notifications service

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createLowStockNotification,
} from '../services/db-notifications'
import type { AppNotification } from '../lib/types'
import { getAllProducts } from '../services/db-products'

export function useNotifications() {
  const queryClient = useQueryClient()

  const notifications = useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => getNotifications(),
  })

  const unreadCount = useQuery<number>({
    queryKey: ['notifications', 'unread'],
    queryFn: getUnreadCount,
  })

  const markRead = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllRead = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteNotif = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    notifications: notifications.data ?? [],
    unreadCount: unreadCount.data ?? 0,
    isLoading: notifications.isLoading,
    markRead: markRead.mutate,
    markAllRead: markAllRead.mutate,
    deleteNotification: deleteNotif.mutate,
  }
}

// Checks products for low stock and generates notifications
export function useLowStockChecker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const products = await getAllProducts()
      const belowThreshold = products.filter(
        (p) => p.trackInventory && p.stockQuantity <= p.lowStockThreshold && p.lowStockThreshold > 0
      )
      await Promise.all(belowThreshold.map((p) => createLowStockNotification(p)))
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
