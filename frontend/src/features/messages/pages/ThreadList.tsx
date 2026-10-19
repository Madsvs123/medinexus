import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Box,
  Button,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import { useGetThreadsQuery } from '../api';
import { userName, type Thread } from '../types';

function threadTitle(t: Thread): string {
  if (t.title) return t.title;
  return t.participants.map((p) => userName(p)).join(', ') || `Thread #${t.id}`;
}

export default function ThreadList() {
  const { data, isLoading, error } = useGetThreadsQuery({ page_size: 50 });
  const navigate = useNavigate();
  const threads = useMemo(() => data?.results ?? [], [data]);

  return (
    <Box>
      <PageHeader
        title="Messages"
        subtitle="Your conversations"
        actions={
          <Button component={RouterLink} to="/messages/new" variant="contained" startIcon={<AddIcon />}>
            New thread
          </Button>
        }
      />
      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          Failed to load threads.
        </Typography>
      )}
      {!isLoading && threads.length === 0 ? (
        <EmptyState
          icon={<ForumIcon />}
          title="No conversations yet"
          hint="Start a new thread to message a colleague."
          action={
            <Button component={RouterLink} to="/messages/new" variant="contained" startIcon={<AddIcon />}>
              New thread
            </Button>
          }
        />
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {threads.map((t, i) => {
              const unread = t.unread_count ?? 0;
              return (
                <ListItemButton
                  key={t.id}
                  divider={i < threads.length - 1}
                  onClick={() => navigate(`/messages/threads/${t.id}`)}
                >
                  <ListItemAvatar>
                    <Badge color="error" variant="dot" invisible={!unread}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>{threadTitle(t).charAt(0).toUpperCase()}</Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight={unread ? 700 : 400} noWrap>
                          {threadTitle(t)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t.last_message_at ? formatDateTime(t.last_message_at) : ''}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color={unread ? 'text.primary' : 'text.secondary'} noWrap>
                        {t.last_message?.body ?? (unread ? `${unread} unread` : 'No messages yet')}
                      </Typography>
                    }
                  />
                  {unread > 0 && (
                    <Badge badgeContent={unread} color="error" sx={{ ml: 1 }} />
                  )}
                </ListItemButton>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
}
