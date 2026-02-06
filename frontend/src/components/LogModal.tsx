import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/libs/api';
import { useWebSocket, LogMessage } from '@/hooks/useWebSocket';
import { useTheme } from '@/libs/theme';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, X, Terminal } from 'lucide-react';

interface LogModalProps {
    orderId: string;
    onClose: () => void;
}

const LogModal: React.FC<LogModalProps> = ({ orderId, onClose }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [historicalLogs, setHistoricalLogs] = useState<LogMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const { logs: liveLogs } = useWebSocket();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Filter live logs for this specific order
    const filteredLiveLogs = liveLogs.filter(log => log.order_id === orderId);

    useEffect(() => {
        const fetchHistorical = async () => {
            try {
                const data = await api.orders.getLogs(orderId);
                // Map DB logs to LogMessage format
                const mappedLogs = data.map((l: any) => ({
                    level: l.level,
                    message: l.message,
                    timestamp: l.created_at,
                    order_id: l.order_id,
                    session_id: l.session_id,
                    step: l.extra_data?.step,
                    type: 'log'
                }));
                setHistoricalLogs(mappedLogs);
            } catch (error) {
                console.error("Failed to fetch historical logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistorical();
    }, [orderId]);

    // Combine logs
    const allLogs = [...historicalLogs, ...filteredLiveLogs];

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [allLogs]);

    const handleDownloadPDF = () => {
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        doc.text("Automation Execution Report", 14, 22);

        // Add metadata
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Order ID: ${orderId}`, 14, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35);

        // Define table columns
        const columns = ["Timestamp", "Level", "Step", "Message"];

        // Prepare table data
        const data = allLogs.map(log => [
            new Date(log.timestamp).toLocaleTimeString(),
            log.level?.toUpperCase() || 'INFO',
            log.step || '-',
            log.message
        ]);

        // Generate table
        autoTable(doc, {
            startY: 45,
            head: [columns],
            body: data,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 15 },
                2: { cellWidth: 25 },
                3: { cellWidth: 'auto' }
            }
        });

        // Save PDF
        doc.save(`logs_${orderId.slice(0, 8)}_${new Date().getTime()}.pdf`);
    };

    const stripAnsi = (str: string) => {
        return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    };

    const formatLevel = (level: string) => {
        return stripAnsi(level || 'INFO').toUpperCase();
    };

    const getLogColor = (log: LogMessage) => {
        const level = log.level?.toUpperCase() || '';
        const message = log.message || '';

        if (level === 'ERROR' || message.includes('[ERROR]')) return isDark ? 'text-red-400 bg-red-500/10' : 'text-red-600 bg-red-50';
        if (level === 'WARNING' || level === 'WARN') return isDark ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-50';
        if (message.includes('[OK]') || message.includes('completed')) return isDark ? 'text-emerald-400' : 'text-emerald-600';
        if (message.includes('[START]')) return isDark ? 'text-blue-400' : 'text-blue-600';
        return isDark ? 'text-slate-300' : 'text-slate-700';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8 animate-fade-in">
            <div className={`w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 ${isDark
                    ? 'bg-[#1e1e2d] border-white/10 ring-1 ring-white/5'
                    : 'bg-white border-slate-200 ring-1 ring-black/5'
                }`}>
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50'
                    }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-black/40 text-blue-400' : 'bg-white border border-border text-blue-600'
                            }`}>
                            <Terminal className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-foreground">Automation Logs</h3>
                            <p className="text-[10px] font-mono text-foreground/40">{orderId}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleDownloadPDF}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-bold ${isDark
                                    ? 'bg-white/5 hover:bg-white/10 border-white/5 text-foreground'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                        >
                            <Download className="w-4 h-4" />
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all text-foreground/40 hover:rotate-90 duration-300"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className={`flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-px custom-scrollbar ${isDark ? 'bg-[#0f111a]' : 'bg-slate-50'
                        }`}
                >
                    {loading && (
                        <div className="flex items-center justify-center h-full text-foreground/40 italic">
                            <span className="animate-pulse">Loading logs...</span>
                        </div>
                    )}

                    {!loading && allLogs.length === 0 && (
                        <div className="flex items-center justify-center h-full text-foreground/40 italic">
                            No logs found for this order.
                        </div>
                    )}

                    {allLogs.map((log, i) => (
                        <div key={i} className={`break-words py-1.5 px-2 rounded-md flex items-start gap-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${getLogColor(log)}`}>
                            <span className="text-foreground/30 flex-shrink-0 w-[85px] tabular-nums text-[10px] select-none text-right">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {log.level && (
                                <span className={`text-[9px] font-black uppercase flex-shrink-0 w-[50px] tracking-wider select-none px-1.5 py-0.5 rounded text-center ${log.level.includes('ERR') ? 'bg-red-500 text-white' :
                                        log.level.includes('WARN') ? 'bg-amber-500 text-black' :
                                            'bg-foreground/10 text-foreground/60'
                                    }`}>
                                    {formatLevel(log.level)}
                                </span>
                            )}
                            <div className="flex-1 min-w-0">
                                {log.step && (
                                    <span className={`font-bold mr-2 text-[10px] ${isDark ? 'text-blue-400' : 'text-blue-600'
                                        }`}>
                                        [{stripAnsi(log.step)}]
                                    </span>
                                )}
                                <span className="font-medium">
                                    {stripAnsi(log.message || '').trim()}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={`p-3 border-t text-xs font-mono flex justify-between items-center ${isDark ? 'bg-[#1e1e2d] border-white/5' : 'bg-white border-slate-200'
                    }`}>
                    <div className="flex items-center space-x-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-foreground/40 font-bold uppercase tracking-widest text-[10px]">Live Monitoring</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LogModal;
