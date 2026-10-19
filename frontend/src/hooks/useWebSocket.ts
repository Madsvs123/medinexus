import { useEffect, useRef, useState } from 'react';

export type SocketState = 'connecting' | 'open' | 'closed' | 'error';

interface UseWebSocketOptions {
  /** Extra query params appended to the URL (e.g. token). */
  params?: Record<string, string>;
  /** Auto-reconnect with this delay (ms). Pass null to disable. */
  reconnectDelay?: number | null;
  onMessage?: (data: unknown) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

function buildUrl(path: string, params?: Record<string, string>): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const base = path.startsWith('/') ? path : `/${path}`;
  const url = `${proto}://${window.location.host}${base}`;
  if (!params || Object.keys(params).length === 0) return url;
  const qs = new URLSearchParams(params).toString();
  return `${url}?${qs}`;
}

/**
 * WebSocket hook with JSON messages and auto-reconnect.
 * Pass `enabled=false` to keep the socket closed.
 */
export function useWebSocket(
  path: string | null,
  options: UseWebSocketOptions = {},
  enabled = true,
) {
  const { params, reconnectDelay = 5000, onMessage, onOpen, onClose, onError } = options;
  const [state, setState] = useState<SocketState>('closed');
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<number | null>(null);
  const handlersRef = useRef({ onMessage, onOpen, onClose, onError });
  handlersRef.current = { onMessage, onOpen, onClose, onError };
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    if (!path || !enabled) return;

    let disposed = false;

    const connect = () => {
      if (disposed || !enabledRef.current) return;
      setState('connecting');
      const ws = new WebSocket(buildUrl(path, params));
      socketRef.current = ws;

      ws.onopen = () => {
        if (disposed) return;
        setState('open');
        handlersRef.current.onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          handlersRef.current.onMessage?.(JSON.parse(event.data as string));
        } catch {
          handlersRef.current.onMessage?.(event.data);
        }
      };

      ws.onerror = () => {
        if (disposed) return;
        setState('error');
        handlersRef.current.onError?.();
      };

      ws.onclose = () => {
        if (disposed) return;
        setState('closed');
        handlersRef.current.onClose?.();
        socketRef.current = null;
        if (reconnectDelay != null && enabledRef.current) {
          retryRef.current = window.setTimeout(connect, reconnectDelay);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryRef.current != null) window.clearTimeout(retryRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [path, enabled, reconnectDelay, params]);

  const send = (data: unknown) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  };

  const close = () => {
    if (retryRef.current != null) window.clearTimeout(retryRef.current);
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  };

  return { state, send, close };
}
