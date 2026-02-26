import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogMessage {
  type: string;
  timestamp: string;
  level?: string;
  message: string;
  session_id?: string;
  order_id?: string;
  step?: string;
  status?: string;
  tira_order_number?: string;
  total?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export function useWebSocket() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    // Don't reconnect if already connected or max attempts reached
    if (ws.current?.readyState === WebSocket.OPEN) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    try {
      // Determine WebSocket URL
      let wsUrl = '';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;

      if (apiUrl) {
        // Convert http(s):// to ws(s)://
        wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/logs';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const currentHost = window.location.hostname;
        // Assume backend is on port 8005 if frontend is on any other port
        wsUrl = `${protocol}//${currentHost}:8005/ws/logs`;
      }

      console.log('Connecting to WebSocket:', wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      socket.onmessage = (event) => {
        try {
          const data: LogMessage = JSON.parse(event.data);

          // Add timestamp if not present
          if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
          }

          setLogs((prev) => {
            // Keep last 500 logs to prevent memory issues
            const newLogs = [...prev, data];
            return newLogs.slice(-500);
          });
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', event.data, e);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        ws.current = null;

        // Attempt reconnection with exponential backoff
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);

        console.log(`Reconnecting in ${delay}ms... (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      socket.onerror = () => {
        // Browser does not expose WS error details
        console.warn('WebSocket encountered an error (details unavailable)');
      };

      ws.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected. Cannot send message.');
    }
  }, []);

  return {
    logs,
    isConnected,
    clearLogs,
    sendMessage,
    reconnect: connect
  };
}