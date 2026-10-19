import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { useSnackbar } from 'notistack';
import { PageHeader, StatusChip, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { useGetPortalNotificationsQuery, useMarkPortalNotificationReadMutation } from '../api';
import type { PortalNotification } from '../types';

export default function PortalNotifications() {
  const { enqueueSnackbar } = useSnackbar();
  const { data, isLoading, error } = useGetPortalNotificationsQuery();
  const [markRead] = useMarkPortalNotificationReadMutation();

  const handleMarkRead = async (n: PortalNotification) => {
    try {
      await markRead(n.id).unwrap();
      enqueueSnackbar('Marked as read', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to mark as read', { variant: 'error' });
    }
  };

  const unread = (data ?? []).filter((n) => !n.is_read).length;

  return (
    <Box>
      <PageHeader title="Notifications" subtitle={`${unread} unread`} />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Chip label="Failed to load notifications." color="error" sx={{ mb: 2 }} />}

      {!isLoading && (data?.length ?? 0) === 0 ? (
        <EmptyState icon={<NotificationsIcon />} title="No notifications" hint="You're all caught up." />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {(data ?? []).map((n, i) => (
              <ListItem
                key={n.id}
                divider={i < (data?.length ?? 0) - 1}
                secondaryAction={
                  !n.is_read ? (
                    <Tooltip title="Mark as read">
                      <IconButton aria-label="Mark as read" edge="end" onClick={() => void handleMarkRead(n)}>
                        <MarkEmailReadIcon />
                      </IconButton>
                    </Tooltip>
                  ) : undefined
                }
                sx={{ bgcolor: n.is_read ? 'transparent' : 'action.hover' }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight={n.is_read ? 400 : 700}>{n.title}</Typography>
                      <StatusChip status={n.type} />
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" component="span" display="block">
                        {n.body}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(n.created_at)}
                      </Typography>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
      {(data?.length ?? 0) > 0 && (
        <Button size="small" sx={{ mt: 1 }} onClick={() => enqueueSnackbar('All caught up', { variant: 'info' })}>
          Refresh
        </Button>
      )}
    </Box>
  );
}
