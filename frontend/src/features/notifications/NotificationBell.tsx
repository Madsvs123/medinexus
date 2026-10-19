import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import CheckIcon from '@mui/icons-material/Check';
import { useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from './api';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { markAllRead as markAllReadLocal, markRead as markReadLocal } from './notificationsSlice';
import { apiErrorMessage } from '@/types/api';
import { relativeTime } from '@/utils/format';

const TYPE_COLORS: Record<string, string> = {
  APPOINTMENT: 'primary.main',
  LAB: 'warning.main',
  RADIOLOGY: 'secondary.main',
  BILLING: 'success.main',
  TASK: 'info.main',
  PRESCRIPTION: 'secondary.main',
  MESSAGE: 'text.secondary',
  SYSTEM: 'text.secondary',
};

export default function NotificationBell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { data: notifications = [], isLoading } = useGetNotificationsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [markRead, { isLoading: isMarking }] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: isMarkingAll }] = useMarkAllNotificationsReadMutation();

  const localUnread = useAppSelector((state) => state.notifications.unreadCount);
  const unreadCount = localUnread > 0 ? localUnread : notifications.filter((n) => !n.is_read).length;

  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleClick = async (id: number) => {
    const item = notifications.find((n) => n.id === id);
    dispatch(markReadLocal(id));
    try {
      await markRead(id).unwrap();
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err, 'Could not update notification'), { variant: 'error' });
    }
    if (item?.data?.url && typeof item.data.url === 'string') {
      navigate(item.data.url);
    }
    handleClose();
  };

  const handleMarkAll = async () => {
    dispatch(markAllReadLocal());
    try {
      await markAll().unwrap();
    } catch (err) {
      enqueueSnackbar(apiErrorMessage(err, 'Could not update notifications'), { variant: 'error' });
    }
  };

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}>
        <IconButton
          onClick={handleOpen}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          color="inherit"
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationsNoneIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxWidth: '92vw', boxShadow: 'var(--mnx-card-shadow)' } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckIcon />}
              onClick={handleMarkAll}
              disabled={isMarkingAll}
            >
              Mark all read
            </Button>
          )}
        </Stack>
        <Divider />
        {isLoading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Loading…
            </Typography>
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You&apos;re all caught up.
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.slice(0, 30).map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => handleClick(n.id)}
                sx={{
                  alignItems: 'flex-start',
                  borderLeft: 3,
                  borderColor: n.is_read ? 'transparent' : (TYPE_COLORS[n.type] ?? 'primary.main'),
                  bgcolor: n.is_read ? 'transparent' : 'action.hover',
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={n.is_read ? 400 : 600}>
                      {n.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {relativeTime(n.created_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
        <Divider />
        <Button fullWidth size="small" sx={{ py: 1 }} disabled={isMarking} onClick={handleClose}>
          Close
        </Button>
      </Popover>
    </>
  );
}
