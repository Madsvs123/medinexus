import { baseApi } from '@/app/api/baseApi';
import type { NotificationItem } from './notificationsSlice';

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<NotificationItem[], { unread?: boolean } | void>({
      query: (params) => ({
        url: '/notifications/',
        params: params && params.unread ? { unread: 'true' } : undefined,
      }),
      providesTags: ['Notifications'],
    }),
    unreadCount: build.query<{ count: number }, void>({
      query: () => ({ url: '/notifications/unread-count/' }),
      providesTags: ['Notifications'],
    }),
    markNotificationRead: build.mutation<NotificationItem, number>({
      query: (id) => ({
        url: `/notifications/${id}/`,
        method: 'PATCH',
        body: { is_read: true },
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: build.mutation<{ detail: string }, void>({
      query: () => ({
        url: '/notifications/mark-all-read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;
