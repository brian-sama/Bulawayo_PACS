import { useEffect, useCallback, useRef } from 'react';

/**
 * Connects to the backend WebSocket notifications endpoint and calls
 * `onNotification` for every JSON message received.
 *
 * Reconnects automatically after 3 seconds if the socket closes unexpectedly.
 * Pass `enabled = false` to suppress the connection (e.g. when logged out).
 */
export const useNotificationSocket = (
  onNotification: (payload: any) => void,
  enabled: boolean = true
) => {
  const wsRef = useRef<WebSocket | null>(null);
  // Keep the callback ref current so closures never go stale
  const onMessageRef = useRef(onNotification);
  useEffect(() => {
    onMessageRef.current = onNotification;
  });

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token || !enabled) return undefined;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const ws = new WebSocket(
      `${protocol}//${host}/ws/notifications/?token=${token}`
    );

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessageRef.current(data);
      } catch {
        // Ignore non-JSON frames
      }
    };

    ws.onclose = (e) => {
      if (e.code !== 1000 && enabled) {
        // Reconnect after 3 s unless we closed deliberately
        setTimeout(connect, 3000);
      }
    };

    wsRef.current = ws;
    return ws;
  }, [enabled]);

  useEffect(() => {
    const ws = connect();
    return () => {
      ws?.close(1000);
      wsRef.current?.close(1000);
    };
  }, [connect]);
};
