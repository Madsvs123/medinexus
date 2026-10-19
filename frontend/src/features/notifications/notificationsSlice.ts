import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<NotificationItem[]>) {
      state.items = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.is_read).length;
    },
    addNotification(state, action: PayloadAction<NotificationItem>) {
      state.items = [action.payload, ...state.items].slice(0, 100);
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    markRead(state, action: PayloadAction<number>) {
      const item = state.items.find((n) => n.id === action.payload);
      if (item && !item.is_read) {
        item.is_read = true;
        item.read_at = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => {
        n.is_read = true;
        n.read_at = n.read_at ?? new Date().toISOString();
      });
      state.unreadCount = 0;
    },
    decrementUnread(state) {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
  },
});

export const { setNotifications, addNotification, markRead, markAllRead, decrementUnread } =
  notificationsSlice.actions;
export default notificationsSlice.reducer;
