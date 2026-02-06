"use client";

import React, { useEffect, useRef } from 'react';
import { LogMessage } from '@/hooks/useWebSocket';
import { Terminal, Activity, Trash2, ArrowDownCircle } from 'lucide-react';
import { useTheme } from '@/libs/theme';

interface LogViewerProps {
    logs: LogMessage[];
    isConnected: boolean;
    onClear: () => void;
}

const LogViewer: React.FC<LogViewerProps> = ({ logs, isConnected, onClear }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef(true);

    useEffect(() => {
        if (scrollRef.current && autoScrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            // If user scrolls up, disable auto-scroll
            autoScrollRef.current = scrollTop + clientHeight >= scrollHeight - 10;
        }
    };

    const getLogColor = (log: LogMessage) => {
        const message = log.message || '';

        // Priority order: level > type > message content
        if (log.level === 'ERROR' || log.type === 'error' || message.includes('[ERROR]')) {
            return isDark
                ? 'text-red-400 border-l-4 border-red-500 bg-red-500/10'
                : 'text-red-700 border-l-4 border-red-500 bg-red-100';
        }
        if (log.level === 'WARNING' || log.level === 'WARN' || message.includes('[WARN]')) {
            return isDark
                ? 'text-amber-400 border-l-4 border-amber-500 bg-amber-500/10'
                : 'text-amber-700 border-l-4 border-amber-500 bg-amber-100';
        }
        if (log.status === 'completed' || message.includes('[SUCCESS]') || message.includes('[OK]')) {
            return isDark
                ? 'text-emerald-400 border-l-4 border-emerald-500 bg-emerald-500/10'
                : 'text-emerald-700 border-l-4 border-emerald-500 bg-emerald-100';
        }
        if (message.includes('[START]') || log.step === 'INIT') {
            return isDark
                ? 'text-blue-400 border-l-4 border-blue-500 bg-blue-500/10'
                : 'text-blue-700 border-l-4 border-blue-500 bg-blue-100';
        }
        if (log.type === 'order_update') {
            if (log.status === 'completed') return isDark
                ? 'text-emerald-400 bg-emerald-500/10 border-l-4 border-emerald-500'
                : 'text-emerald-700 bg-emerald-100 border-l-4 border-emerald-500';

            if (log.status === 'failed') return isDark
                ? 'text-red-400 bg-red-500/10 border-l-4 border-red-500'
                : 'text-red-700 bg-red-100 border-l-4 border-red-500';

            if (log.status === 'processing') return isDark
                ? 'text-amber-400 bg-amber-500/10 border-l-4 border-amber-500'
                : 'text-amber-700 bg-amber-100 border-l-4 border-amber-500';

            return isDark
                ? 'text-cyan-400 bg-cyan-500/10 border-l-4 border-cyan-500'
                : 'text-cyan-700 bg-cyan-100 border-l-4 border-cyan-500';
        }
        if (log.level === 'DEBUG') {
            return isDark
                ? 'text-slate-500 border-l-4 border-slate-700 bg-slate-500/10'
                : 'text-slate-700 border-l-4 border-slate-400 bg-slate-100';
        }
        // Default text
        return isDark
            ? 'text-slate-300 border-l-4 border-slate-700 bg-white/5 hover:bg-white/10'
            : 'text-slate-900 border-l-4 border-slate-400 bg-slate-50 hover:bg-slate-100';
    };

    const formatTimestamp = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                fractionalSecondDigits: 3
            });
        } catch {
            return new Date().toLocaleTimeString();
        }
    };

    const stripAnsi = (str: string) => {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    };

    const formatLogMessage = (log: LogMessage) => {
        if (log.type === 'order_update') {
            const parts = [
                log.status?.toUpperCase(),
                log.session_id ? `Session: ${log.session_id}` : null,
                log.tira_order_number ? `Order #${log.tira_order_number}` : null,
                log.total ? `Total: ₹${log.total}` : null,
                log.error ? `Error: ${log.error}` : null
            ].filter(Boolean);

            return parts.join(' • ');
        }

        return stripAnsi(log.message || '[No message]').trim();
    };

    return (
        <div className="flex flex-col rounded-2xl border-2 border-border bg-card shadow-xl h-[700px] overflow-hidden relative group">
            {/* Header */}
            <div className="p-4 border-b-2 border-border flex items-center justify-between bg-muted/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center space-x-3">
                    <div className="bg-primary/20 dark:bg-primary/10 p-2 rounded-lg border-2 border-primary/30 dark:border-primary/20">
                        <Terminal className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            Live Monitor
                            <span className={`inline-flex h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`} />
                        </h3>
                        <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
                            {isConnected ? 'System Online' : 'Offline'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    className="p-2 text-muted-foreground hover:text-red-600 dark:hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-500/10 rounded-lg transition-all border border-transparent hover:border-red-200 dark:hover:border-red-500/20"
                    title="Clear Logs"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Log Content */}
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 custom-scrollbar scroll-smooth bg-muted/30 dark:bg-background/50"
            >
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                        <div className="p-4 rounded-full bg-muted border-2 border-border">
                            <Activity className="w-8 h-8 opacity-50" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium">Ready to Execute</p>
                            <p className="text-[10px] mt-1 opacity-70">Waiting for automation sequence...</p>
                        </div>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div
                            key={i}
                            className={`${getLogColor(log)} transition-all duration-200 px-4 py-3 rounded-r-lg flex gap-4 animate-fade-in group/log shadow-sm`}
                        >
                            <span className={`text-[10px] mt-0.5 select-none font-medium tabular-nums min-w-[75px] ${isDark ? 'text-muted-foreground' : 'text-slate-600'}`}>
                                {formatTimestamp(log.timestamp)}
                            </span>

                            <div className="flex-1 break-words leading-relaxed font-medium">
                                {log.step && (
                                    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mr-2 mb-1 border ${isDark
                                        ? 'bg-foreground/5 text-foreground/70 border-foreground/10'
                                        : 'bg-slate-200 text-slate-700 border-slate-300'
                                        }`}>
                                        {stripAnsi(log.step)}
                                    </span>
                                )}
                                {formatLogMessage(log)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Scroll Button */}
            {!autoScrollRef.current && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 animate-fade-in">
                    <button
                        onClick={() => {
                            autoScrollRef.current = true;
                            if (scrollRef.current) {
                                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                            }
                        }}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full shadow-xl shadow-primary/30 text-xs font-bold flex items-center gap-2 transition-all transform hover:-translate-y-1 border-2 border-primary/20"
                    >
                        <ArrowDownCircle className="w-4 h-4" />
                        Jump to Latest
                    </button>
                </div>
            )}
        </div>
    );
};

export default LogViewer;