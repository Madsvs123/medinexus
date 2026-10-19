import { useCallback, useEffect, useRef, useState } from 'react';
import { readStoredTokens } from '../../../app/api/baseApi';

export interface ChatWsMessage {
  id: number;
  thread: number;
  sender: number;
  sender_name?: string;
  body: string;
  attachment: string | null;
  sent_at: string;
}

interface Handlers {
  onMessage?: (msg: ChatWsMessage) => void;
  onTyping?: (senderId: number) => void;
  onOpen?: () => void;
}

export type SocketStatus = 'connecting' | 'open' | 'closed';

/**
 * WebSocket hook for chat. Connects to ws(s)://host/ws/chat/<threadId>/?token=<jwt>
 * (JwtAuthMiddleware per §3.5). Sends JSON via `send`.
 */
export function useChatSocket(threadId: number | undefined, handlers: Handlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [status, setStatus] = useState<SocketStatus>('connecting');

  useEffect(() => {
    if (!threadId) return undefined;
    const token = readStoredTokens().access ?? '';
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws/chat/${threadId}/?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;
    setStatus('connecting');
    ws.onopen = () => {
      setStatus('open');
      handlersRef.current.onOpen?.();
    };
    ws.onclose = () => setStatus('closed');
    ws.onerror = () => setStatus('closed');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { type?: string; message?: ChatWsMessage; sender_id?: number };
        if (data.type === 'chat.message' && data.message) {
          handlersRef.current.onMessage?.(data.message);
        } else if (data.type === 'typing' && data.sender_id) {
          handlersRef.current.onTyping?.(Number(data.sender_id));
        }
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [threadId]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { status, send };
}
