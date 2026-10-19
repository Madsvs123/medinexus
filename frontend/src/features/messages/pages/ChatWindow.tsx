import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, CircularProgress, LinearProgress, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import { useSnackbar } from 'notistack';
import { PageHeader, EmptyState } from '../../../components/ui';
import {
  useGetThreadQuery,
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useSendMessageMutation,
  useMarkThreadReadMutation,
} from '../api';
import type { ChatMessage } from '../types';
import { userName } from '../types';
import ChatBox from '../components/ChatBox';
import MessageBubble from '../components/MessageBubble';
import { useChatSocket } from '../hooks/useChatSocket';

function getErr(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (data?.detail) return String(data.detail);
    const first = Object.values(data ?? {}).find((v) => v !== undefined && v !== null);
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === 'string') return first;
  }
  return 'Failed to send message.';
}

function dedupe(messages: ChatMessage[]): ChatMessage[] {
  const seen = new Set<number>();
  const out: ChatMessage[] = [];
  for (const m of messages) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      out.push(m);
    }
  }
  return out;
}

export default function ChatWindow() {
  const { id } = useParams();
  const threadId = Number(id);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const me = useSelector((state: RootState) => state.auth.user);
  const myId = me?.id;

  const { data: thread, isLoading: threadLoading } = useGetThreadQuery(threadId);
  const { data: messagesData, isLoading: messagesLoading } = useGetMessagesQuery({ threadId, page_size: 50 });
  const [fetchOlder] = useLazyGetMessagesQuery();
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [markRead] = useMarkThreadReadMutation();

  const [older, setOlder] = useState<ChatMessage[]>([]);
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [typingSender, setTypingSender] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    setOlder([]);
    setLive([]);
    setHasMore(false);
    if (threadId) void markRead(threadId);
  }, [threadId, markRead]);

  const allMessages = useMemo(() => dedupe([...older, ...(messagesData?.results ?? []), ...live]), [older, messagesData, live]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  useEffect(() => {
    setHasMore((messagesData?.count ?? 0) > (older.length + (messagesData?.results.length ?? 0)));
  }, [messagesData, older.length]);

  const handleWsMessage = useCallback((msg: { id: number; thread: number; sender: number; body: string; attachment: string | null; sent_at: string }) => {
    setLive((prev) => dedupe([...prev, msg as ChatMessage]));
  }, []);

  const handleWsTyping = useCallback((senderId: number) => {
    if (senderId === myId) return;
    setTypingSender(senderId);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => setTypingSender(null), 3000);
  }, [myId]);

  const { status: socketStatus, send } = useChatSocket(threadId, {
    onMessage: handleWsMessage,
    onTyping: handleWsTyping,
  });

  const handleSend = async (body: string, file?: File | null) => {
    try {
      await sendMessage({ threadId, body, attachment: file ?? null }).unwrap();
    } catch (e) {
      enqueueSnackbar(getErr(e), { variant: 'error' });
    }
  };

  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current > 1500) {
      lastTypingSent.current = now;
      send({ type: 'typing', thread_id: threadId });
    }
  };

  const loadOlder = async () => {
    const oldest = allMessages[0];
    if (!oldest) return;
    const res = await fetchOlder({ threadId, before: oldest.sent_at, page_size: 50 }).unwrap();
    setOlder((prev) => dedupe([...res.results, ...prev]));
  };

  const threadTitle = thread?.title || (thread?.participants ?? []).map((p) => userName(p)).join(', ') || `Thread #${threadId}`;

  if (threadLoading) return <LinearProgress />;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 420 }}>
      <PageHeader
        title={threadTitle}
        subtitle={`${socketStatus === 'open' ? 'Connected' : socketStatus === 'connecting' ? 'Connecting…' : 'Disconnected'}${typingSender != null ? ' • typing…' : ''}`}
        actions={
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/messages')}>
            Back
          </Button>
        }
      />

      <Box sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1 }}>
        {messagesLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : allMessages.length === 0 ? (
          <EmptyState title="No messages yet" hint="Say hello to start the conversation." />
        ) : (
          <>
            {hasMore && (
              <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Button size="small" onClick={() => void loadOlder()}>
                  Load older messages
                </Button>
              </Box>
            )}
            {allMessages.map((m) => (
              <MessageBubble key={m.id} message={m} mine={myId != null && (typeof m.sender === 'number' ? m.sender === myId : m.sender.id === myId)} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ pt: 1 }}>
        <ChatBox onSend={(body, file) => handleSend(body, file)} onTyping={handleTyping} disabled={!threadId} busy={sending} />
      </Box>
    </Box>
  );
}
