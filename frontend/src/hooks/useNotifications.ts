import { useCallback } from 'react';
import { enqueueSnackbar } from 'notistack';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  markAllRead,
  markRead,
  setNotifications,
  type NotificationItem,
} from '@/features/notifications/notificationsSlice';
import { useMarkAllNotificationsReadMutation, useMarkNotificationReadMutation } from '@/features/notifications/api';
import { apiErrorMessage } from '@/types/api';

/**
 * Convenience hook for consuming notifications from anywhere in the app:
 * exposes the current list, unread count and read actions wired to both
 * the Redux store and the REST API.
 */
export function useNotifications() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.notifications.items);
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);
  const [markReadRemote] = useMarkNotificationReadMutation();
  const [markAllRemote] = useMarkAllNotificationsReadMutation();

  const load = useCallback(
    (notifications: NotificationItem[]) => {
      dispatch(setNotifications(notifications));
    },
    [dispatch],
  );

  const read = useCallback(
    async (id: number) => {
      dispatch(markRead(id));
      try {
        await markReadRemote(id).unwrap();
      } catch (err) {
        enqueueSnackbar(apiErrorMessage(err, 'Could not update notification'), { variant: 'error' });
      }
    },
    [dispatch, markReadRemote],
  );

  const readAll = useCallback(async () => {
    dispatch(markAllRead());
    try {
      await markAllRemote().unwrap();
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err, 'Could not update notifications'), { variant: 'error' });
    }
  }, [dispatch, markAllRemote]);

  return { items, unreadCount, load, read, readAll };
}
