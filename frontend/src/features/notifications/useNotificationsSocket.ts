import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addNotification } from './notificationsSlice';
import { notificationsApi } from './api';

interface WsEnvelope {
  type?: string;
  notification?: {
    id: number;
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown> | null;
    is_read?: boolean;
    read_at?: string | null;
    created_at?: string;
  };
}

/**
 * Opens the notifications WebSocket while authenticated and
 * feeds incoming notifications into the Redux store.
 */
export function useNotificationsSocket(enabled = true) {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const { state } = useWebSocket(
    '/ws/notifications/',
    {
      params: accessToken ? { token: accessToken } : undefined,
      reconnectDelay: 5000,
      onMessage: (raw) => {
        const envelope = raw as WsEnvelope;
        const notification = envelope?.notification;
        if (notification && typeof notification.id === 'number') {
          dispatch(
            addNotification({
              id: notification.id,
              type: notification.type ?? 'SYSTEM',
              title: notification.title ?? 'Notification',
              body: notification.body ?? '',
              data: notification.data ?? null,
              is_read: notification.is_read ?? false,
              read_at: notification.read_at ?? null,
              created_at: notification.created_at ?? new Date().toISOString(),
            }),
          );
          // Keep the REST cache in sync lazily.
          dispatch(notificationsApi.util.invalidateTags(['Notifications']));
        }
      },
    },
    enabled && isAuthenticated,
  );

  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    // Seed initial list once connected.
    dispatch(notificationsApi.endpoints.getNotifications.initiate(undefined));
  }, [enabled, isAuthenticated, dispatch]);

  return { connected: state === 'open' };
}
