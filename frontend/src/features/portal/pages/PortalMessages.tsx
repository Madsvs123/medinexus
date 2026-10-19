import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';
import AddIcon from '@mui/icons-material/Add';
import { useSnackbar } from 'notistack';
import { PageHeader, EmptyState } from '../../../components/ui';
import { formatDateTime } from '../../../utils/format';
import {
  useGetPortalThreadsQuery,
  useGetPortalThreadMessagesQuery,
  useSendPortalMessageMutation,
  useCreatePortalThreadMutation,
} from '../api';
import ChatBox from '../../messages/components/ChatBox';
import { useChatSocket } from '../../messages/hooks/useChatSocket';

interface PortalThread {
  id: number;
  title: string;
  participants: Array<{ id: number; first_name: string; last_name: string; email?: string }>;
  last_message_at: string | null;
  last_message?: { id: number; body: string; sender_name?: string; sent_at: string } | null;
}

interface PortalChatMessage {
  id: number;
  thread: number;
  sender: number | { id: number; first_name: string; last_name: string };
  body: string;
  attachment: string | null;
  sent_at: string;
}

const participantName = (p: PortalThread['participants'][number]): string =>
  `${p.first_name} ${p.last_name}`.trim() || p.email || `User #${p.id}`;

function threadTitle(t: PortalThread): string {
  if (t.title) return t.title;
  return t.participants.map(participantName).join(', ') || `Thread #${t.id}`;
}

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Something went wrong. Please try again.';
}

export default function PortalMessages() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: threads, isLoading } = useGetPortalThreadsQuery();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const me = useSelector((state: RootState) => state.auth.user);
  const myId = me?.id;

  const activeThread = useMemo(() => threads?.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  return (
    <Box>
      <PageHeader
        title="Messages"
        subtitle="Chat with our care team"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>
            New thread
          </Button>
        }
      />
      {isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {!isLoading && (threads?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<ForumIcon />}
          title="No conversations yet"
          hint="Start a thread to message our care team."
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewOpen(true)}>
              New thread
            </Button>
          }
        />
      ) : (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Paper variant="outlined" sx={{ width: 280, flexShrink: 0 }}>
            <List disablePadding>
              {(threads ?? []).map((t, i) => (
                <ListItemButton
                  key={t.id}
                  divider={i < (threads?.length ?? 0) - 1}
                  selected={t.id === activeId}
                  onClick={() => setActiveId(t.id)}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {threadTitle(t).charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={600} noWrap>{threadTitle(t)}</Typography>}
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {t.last_message?.body ?? (t.last_message_at ? formatDateTime(t.last_message_at) : 'No messages')}
                      </Typography>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {activeThread ? (
              <ThreadChat threadId={activeThread.id} myId={myId} />
            ) : (
              <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Select a conversation to start chatting.
                </Typography>
              </Paper>
            )}
          </Box>
        </Box>
      )}

      {newOpen && <NewPortalThreadDialog open onClose={() => setNewOpen(false)} onCreated={(id) => setActiveId(id)} />}
    </Box>
  );
}

function ThreadChat({ threadId, myId }: { threadId: number; myId?: number }) {
  const { enqueueSnackbar } = useSnackbar();
  const { data: messages, isLoading } = useGetPortalThreadMessagesQuery({ threadId });
  const [sendMessage] = useSendPortalMessageMutation();
  const [live, setLive] = useState<PortalChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    setLive([]);
    setTyping(false);
  }, [threadId]);

  const allMessages = useMemo(() => {
    const seen = new Set<number>();
    const out: PortalChatMessage[] = [];
    for (const m of [...(messages ?? []), ...live]) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }, [messages, live]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  const handleWsMessage = useCallback((msg: PortalChatMessage) => {
    setLive((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  }, []);

  const handleWsTyping = useCallback((senderId: number) => {
    if (senderId === myId) return;
    setTyping(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTyping(false), 3000);
  }, [myId]);

  const { send } = useChatSocket(threadId, { onMessage: handleWsMessage, onTyping: handleWsTyping });

  const handleSend = async (body: string) => {
    try {
      await sendMessage({ threadId, body }).unwrap();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  return (
    <Paper variant="outlined" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 260px)', minHeight: 380 }}>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
        {isLoading ? (
          <LinearProgress />
        ) : allMessages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No messages yet — say hello!
          </Typography>
        ) : (
          allMessages.map((m) => {
            const mine = myId != null && (typeof m.sender === 'number' ? m.sender === myId : m.sender.id === myId);
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    maxWidth: '70%',
                    px: 1.5,
                    py: 1,
                    bgcolor: mine ? 'primary.main' : 'background.paper',
                    color: mine ? 'primary.contrastText' : 'text.primary',
                  }}
                >
                  {!mine && (
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {typeof m.sender === 'object' ? `${m.sender.first_name} ${m.sender.last_name}` : `User #${m.sender}`}
                    </Typography>
                  )}
                  {m.body && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.body}</Typography>}
                  <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', textAlign: 'right' }}>
                    {formatDateTime(m.sent_at)}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
        {typing && <Typography variant="caption" color="text.secondary">Care team is typing…</Typography>}
        <div ref={bottomRef} />
      </Box>
      <Box sx={{ p: 1 }}>
        <ChatBox
          onSend={(body) => handleSend(body)}
          onTyping={() => send({ type: 'typing', thread_id: threadId })}
          placeholder="Type a message…"
        />
      </Box>
    </Paper>
  );
}

function NewPortalThreadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const { enqueueSnackbar } = useSnackbar();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [createThread] = useCreatePortalThreadMutation();
  const [sendMessage] = useSendPortalMessageMutation();
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const thread = await createThread({ title: title || undefined }).unwrap();
      if (body.trim()) {
        await sendMessage({ threadId: thread.id, body }).unwrap();
      }
      enqueueSnackbar('Thread created', { variant: 'success' });
      onClose();
      onCreated(thread.id);
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New thread</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Subject (optional)" fullWidth size="small" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField
            label="First message"
            fullWidth
            size="small"
            multiline
            minRows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <Chip label="A care team member will join your thread" size="small" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={submitting || (!title.trim() && !body.trim())} onClick={() => void handleCreate()}>
          Start thread
        </Button>
      </DialogActions>
    </Dialog>
  );
}
