import { useState, useEffect, useRef } from 'react';

export interface SystemStats {
    cpu: number;
    memory: {
        total: number;
        available: number;
        percent: number;
        used: number;
    };
    timestamp: number;
}

export function useSystemStats(enabled: boolean = true) {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!enabled) {
            setIsConnected(false);
            setStats(null);
            return;
        }

        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            // Determine WebSocket URL
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

            // Better host detection
            let host = process.env.NEXT_PUBLIC_WS_URL;
            if (!host) {
                const currentHost = window.location.hostname;
                // Assume backend is on port 8005
                host = `${currentHost}:8005`;
            }

            const wsUrl = `${protocol}//${host}/ws/system`;

            const socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                setIsConnected(true);
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setStats(data);
                } catch (e) {
                    console.error('Failed to parse system stats:', e);
                }
            };

            socket.onclose = () => {
                setIsConnected(false);
                // Try to reconnect in 5 seconds only if still enabled
                if (enabled) {
                    reconnectTimeout = setTimeout(connect, 5000);
                }
            };

            socket.onerror = () => {
                // ws.current?.close();
            };

            ws.current = socket;
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
            clearTimeout(reconnectTimeout);
        };
    }, [enabled]);

    return { stats, isConnected };
}
