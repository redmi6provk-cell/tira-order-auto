import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '@/libs/api';
import { BarChart, StopCircle, Radio, Loader2, Trash2 } from 'lucide-react';
import { useTheme } from '@/libs/theme';
import ActionModal from './ui/ActionModal';
import { LogMessage } from '@/hooks/useWebSocket';

interface BatchSummary {
    batch_id: string;
    created_at: string;
    total_orders: number;
    successful_orders: number;
    failed_orders: number;
    total_amount: number;
}

interface LiveBatch {
    batch_id: string;
    started_at: string;
    total_users: number;
    successful: number;
    failed: number;
    errors: number;
    completed: boolean;
    stopped: boolean;
}

interface BatchHistoryProps {
    onSelectBatch: (batchId: string) => void;
    logs?: LogMessage[];
    isWsConnected?: boolean;
}

const BatchHistory: React.FC<BatchHistoryProps> = ({ onSelectBatch, logs = [], isWsConnected = false }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStopping, setIsStopping] = useState(false);
    const [initialLiveBatch, setInitialLiveBatch] = useState<LiveBatch | null>(null);

    // Track live batches from WebSocket messages AND initial API fetch
    const liveBatches = useMemo(() => {
        const map = new Map<string, LiveBatch>();

        // 1. Add initial live batch if exists (from API)
        if (initialLiveBatch && !initialLiveBatch.completed) {
            map.set(initialLiveBatch.batch_id, initialLiveBatch);
        }

        // 2. Process logs
        for (const log of logs) {
            if (log.metadata?.batch_id) {
                const batchId = log.metadata.batch_id as string;
                const step = log.step || '';

                if (step === 'BULK_START') {
                    map.set(batchId, {
                        batch_id: batchId,
                        started_at: log.timestamp,
                        total_users: (log.metadata.user_range?.[1] ?? 0) - (log.metadata.user_range?.[0] ?? 0) + 1,
                        successful: 0,
                        failed: 0,
                        errors: 0,
                        completed: false,
                        stopped: false,
                    });
                } else if (step === 'BULK_COMPLETE' || step === 'BULK_STOPPED') {
                    const batch = map.get(batchId);
                    if (batch) {
                        batch.completed = true;
                        batch.stopped = step === 'BULK_STOPPED';
                        batch.successful = log.metadata.successful ?? batch.successful;
                        batch.failed = log.metadata.failed ?? batch.failed;
                        batch.errors = log.metadata.errors ?? batch.errors;
                    }
                }
            } else if (log.type === 'order_update') {
                // Order updates might come with batch_id now
                // But our LogMessage type definition in useWebSocket might need updating to include batch_id
                // However, we cast 'log' to any or extend interface safely here
                const update = log as any;
                if (update.batch_id) {
                    const batchId = update.batch_id;
                    const batch = map.get(batchId);
                    if (batch && !batch.completed) {
                        // We can't easily increment counters without knowing if THIS order was already counted
                        // Ideally, the order update would return TOTAL stats for the batch, 
                        // but currently it only returns status for ONE order.
                        // A simplified approach:
                        // We rely on the initial state + incrementing. 
                        // But if we missed the start, we might start from 0.
                        // For now, let's just mark it as "working" by ensuring it exists?
                        // Actually, without total stats in order_update, we can't accurately "sync" success/fail counts
                        // purely from order_updates if we joined late.
                        // BUT, if we loaded "initialLiveBatch" from API, that should have current counts!
                        // Let's assume initialLiveBatch gave us a baseline.

                        // For accurate live counting without complex sync, 
                        // we would need order_update to include {batch_stats: {successful, failed}}.
                        // OR we just accept that the counts might only reflect updates received since load
                        // coupled with the snapshot we got at load time.

                        // Improve: Start from API snapshot, then apply updates.
                        if (update.status === 'completed') {
                            batch.successful++;
                        } else if (update.status === 'failed') {
                            batch.failed++;
                        }

                        // Update the map reference to force re-render? 
                        // map.set(batchId, { ...batch }); // Not needed as we mutate object, but typical React pattern might need new ref
                    }
                }
            }
        }

        return Array.from(map.values()).filter(b => !b.completed);
    }, [logs, initialLiveBatch]);

    useEffect(() => {
        fetchBatches();
        fetchActiveAutomation();
    }, []);

    // Re-fetch batches when a live batch completes
    useEffect(() => {
        const completedInLogs = logs.some(
            l => (l.type === 'log' || l.type === 'order_update') &&
                (l.step === 'BULK_COMPLETE' || l.step === 'BULK_STOPPED')
        );
        if (completedInLogs) {
            const timer = setTimeout(() => {
                fetchBatches();
                fetchActiveAutomation(); // Refresh active state too
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [logs]);

    const fetchBatches = async () => {
        try {
            const data = await api.orders.getBatches();
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch batches:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchActiveAutomation = async () => {
        try {
            // We need an endpoint that returns BATCH level info for active orders.
            // Currently /automation/active returns list of orders.
            // We can derive the batch info from that.
            const data = await api.automation.getActive();
            if (data.count > 0 && data.orders.length > 0) {
                // Group by batch_id
                const orders = data.orders;
                const batchId = orders[0].batch_id; // Assume one batch for now
                if (!batchId) return;

                const successful = orders.filter((o: any) => o.status === 'completed').length;
                const failed = orders.filter((o: any) => o.status === 'failed').length;
                const total = orders.length; // This is active orders? Or all orders in batch?
                // The API get_active_orders returns "active_orders" dict from executor.
                // Does executor keep completed orders in active_orders? 
                // YES, until batch end.

                setInitialLiveBatch({
                    batch_id: batchId,
                    started_at: new Date().toISOString(), // Approximation if not in order data
                    total_users: total,
                    successful: successful,
                    failed: failed,
                    errors: 0,
                    completed: false,
                    stopped: false
                });
            } else {
                setInitialLiveBatch(null);
            }
        } catch (error) {
            console.error("Failed to fetch active automation:", error);
        }
    };

    const [showStopModal, setShowStopModal] = useState(false);
    const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleStopClick = () => {
        setShowStopModal(true);
    };

    const confirmStop = async () => {
        setShowStopModal(false);
        setIsStopping(true);
        try {
            await api.automation.stop();
        } catch (error) {
            console.error("Failed to stop automation:", error);
            // alert("Failed to stop automation"); // Optional: replace with toast
        } finally {
            setTimeout(() => setIsStopping(false), 3000);
        }
    };

    const handleDeleteBatch = async (e: React.MouseEvent, batchId: string) => {
        e.stopPropagation();
        setBatchToDelete(batchId);
    };

    const confirmDeleteBatch = async () => {
        if (!batchToDelete) return;

        setIsDeleting(batchToDelete);
        try {
            await api.orders.deleteBatch(batchToDelete);
            fetchBatches();
        } catch (error) {
            console.error("Failed to delete batch:", error);
            alert("Failed to delete batch");
        } finally {
            setIsDeleting(null);
            setBatchToDelete(null);
        }
    };

    const hasLive = liveBatches.length > 0;

    // Unified stylish modals
    return (
        <div className="space-y-6">
            <ActionModal
                isOpen={showStopModal}
                title="Stop Automation"
                message="Are you sure you want to stop the currently running automation? Running orders will finish, but remaining orders in the queue will be skipped."
                confirmText="Stop Automation"
                onConfirm={confirmStop}
                onCancel={() => setShowStopModal(false)}
                isLoading={isStopping}
                variant="warning"
            />

            <ActionModal
                isOpen={!!batchToDelete}
                title="Delete Batch History"
                message="Are you sure you want to delete this automation batch and all its order records? This action cannot be undone."
                confirmText="Delete History"
                onConfirm={confirmDeleteBatch}
                onCancel={() => setBatchToDelete(null)}
                isLoading={!!isDeleting && isDeleting === batchToDelete}
                variant="danger"
            />

            {/* Live Running Batches */}
            {hasLive && (
                <div className={`rounded-2xl border-2 overflow-hidden backdrop-blur-xl transition-all ${isDark
                    ? 'bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/10'
                    : 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-200'
                    }`}>
                    <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-blue-500/20 bg-blue-500/10' : 'border-blue-200 bg-blue-100/50'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center">
                                <Radio className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'} animate-pulse`} />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                            </div>
                            <h3 className={`font-bold uppercase tracking-widest text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                Live Automation
                            </h3>
                            {isWsConnected && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isDark
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                    : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                    }`}>
                                    WS CONNECTED
                                </span>
                            )}
                        </div>

                        <button
                            onClick={handleStopClick}
                            disabled={isStopping}
                            className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 ${isDark
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30'
                                : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                                }`}
                        >
                            {isStopping ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <StopCircle className="w-4 h-4" />
                            )}
                            {isStopping ? 'Stopping...' : 'Stop Automation'}
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {liveBatches.map((lb) => (
                            <div
                                key={lb.batch_id}
                                className={`flex items-center justify-between p-4 rounded-xl border ${isDark
                                    ? 'bg-white/5 border-white/10'
                                    : 'bg-white/80 border-slate-200'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                                        <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    </div>
                                    <div>
                                        <div className="font-mono font-bold text-foreground/80 text-sm">
                                            {lb.batch_id.slice(0, 8)}...
                                        </div>
                                        <div className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
                                            {lb.total_users} Users • Started {new Date(lb.started_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-3 text-xs font-mono font-bold">
                                        <span className="text-emerald-500">{lb.successful} ✓</span>
                                        <span className="text-foreground/20">|</span>
                                        <span className="text-red-500">{lb.failed + lb.errors} ✗</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Historical Batches */}
            {batches.length === 0 && !hasLive ? (
                <div className="text-center p-8 text-foreground/50 italic">
                    No automation history found. Run a new batch to see stats here.
                </div>
            ) : (
                <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl transition-all ${isDark
                    ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
                    : 'bg-white/60 border-black/5 ring-1 ring-black/5'
                    }`}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className={`sticky top-0 z-10 backdrop-blur shadow-sm border-b ${isDark
                                ? 'bg-[#1e1e2d]/80 border-white/5'
                                : 'bg-white/80 border-slate-200'
                                }`}>
                                <tr>
                                    <th className="px-6 py-4 font-bold text-foreground/70 uppercase tracking-widest text-xs">Execution ID</th>
                                    <th className="px-6 py-4 font-bold text-foreground/70 uppercase tracking-widest text-xs">Date</th>
                                    <th className="px-6 py-4 font-bold text-foreground/70 uppercase tracking-widest text-xs text-center">Orders</th>
                                    <th className="px-6 py-4 font-bold text-foreground/70 uppercase tracking-widest text-xs">Performance</th>
                                    <th className="px-6 py-4 font-bold text-foreground/70 uppercase tracking-widest text-xs text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                                {batches.map((batch) => {
                                    const date = new Date(batch.created_at);
                                    const successRate = batch.total_orders > 0
                                        ? Math.round((batch.successful_orders / batch.total_orders) * 100)
                                        : 0;

                                    return (
                                        <tr
                                            key={batch.batch_id}
                                            onClick={() => onSelectBatch(batch.batch_id)}
                                            className={`transition-colors cursor-pointer group ${isDark
                                                ? 'hover:bg-white/5'
                                                : 'hover:bg-slate-50'
                                                }`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-foreground/80 group-hover:text-primary transition-colors">
                                                    {batch.batch_id.slice(0, 8)}...
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground/80">{date.toLocaleDateString()}</span>
                                                    <span className="text-xs text-foreground/40">{date.toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold font-mono border ${isDark
                                                    ? 'bg-white/5 border-white/10'
                                                    : 'bg-slate-100 border-slate-200'
                                                    }`}>
                                                    {batch.total_orders}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-4">
                                                    <div className={`flex-1 w-32 rounded-full h-2 overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'
                                                        }`}>
                                                        <div
                                                            className={`h-full rounded-full shadow-sm ${successRate > 80 ? 'bg-emerald-500' : successRate > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${successRate}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs font-mono">
                                                        <span className="text-emerald-500 font-bold">{batch.successful_orders}</span>
                                                        <span className="text-foreground/20">/</span>
                                                        <span className="text-red-500 font-bold">{batch.failed_orders}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <button
                                                        onClick={(e) => handleDeleteBatch(e, batch.batch_id)}
                                                        disabled={isDeleting === batch.batch_id}
                                                        className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-95 ${isDark
                                                            ? 'hover:bg-red-500/10 text-red-400/40 hover:text-red-400'
                                                            : 'hover:bg-red-50 text-red-500/40 hover:text-red-600'}`}
                                                        title="Delete Batch"
                                                    >
                                                        {isDeleting === batch.batch_id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <button className="text-xs font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 flex items-center justify-end gap-1 group-hover:translate-x-1 transition-transform">
                                                        Details <BarChart className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchHistory;
