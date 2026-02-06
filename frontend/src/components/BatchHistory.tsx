import React, { useEffect, useState } from 'react';
import { api } from '@/libs/api';
import { BarChart } from 'lucide-react';
import { useTheme } from '@/libs/theme';

interface BatchSummary {
    batch_id: string;
    created_at: string;
    total_orders: number;
    successful_orders: number;
    failed_orders: number;
    total_amount: number;
}

interface BatchHistoryProps {
    onSelectBatch: (batchId: string) => void;
}

const BatchHistory: React.FC<BatchHistoryProps> = ({ onSelectBatch }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [batches, setBatches] = useState<BatchSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchBatches();
    }, []);

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

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (batches.length === 0) {
        return (
            <div className="text-center p-8 text-foreground/50 italic">
                No automation history found. Run a new batch to see stats here.
            </div>
        );
    }

    return (
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
                                        <button className="text-xs font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 flex items-center justify-end gap-1 group-hover:translate-x-1 transition-transform">
                                            Details <BarChart className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BatchHistory;
