import React, { useState, useEffect } from 'react';
import { api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { X, Activity } from 'lucide-react';

interface BatchStatsModalProps {
    batchId: string;
    onClose: () => void;
}

const BatchStatsModal: React.FC<BatchStatsModalProps> = ({ batchId, onClose }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await api.orders.getBatchStats(batchId);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch batch stats:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
        // Set up polling for live updates if still in progress
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [batchId]);

    if (loading && !stats) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border animate-pulse ${isDark ? 'bg-[#1e1e2d] border-white/10' : 'bg-white border-slate-200'
                    }`}>
                    <div className={`h-6 w-32 rounded mb-4 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>
                    <div className={`h-24 rounded ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
                </div>
            </div>
        );
    }

    const successRate = stats ? (stats.successful / stats.total) * 100 : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in duration-200 ring-1 ring-black/5 ${isDark
                    ? 'bg-[#1e1e2d]/95 border-white/10'
                    : 'bg-white/95 border-black/5'
                }`}>
                <div className={`p-6 border-b flex items-center justify-between bg-gradient-to-r ${isDark
                        ? 'border-white/5 from-blue-500/10 to-purple-500/10'
                        : 'border-slate-100 from-blue-500/5 to-purple-500/5'
                    }`}>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Activity className={`w-5 h-5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                        Execution Batch Stats
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all text-foreground/40 hover:rotate-90 duration-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className={`p-6 space-y-6 ${isDark ? 'bg-transparent' : 'bg-slate-50/50'}`}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border text-center transition-all hover:scale-105 duration-200 ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                            }`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Total Orders</div>
                            <div className={`text-2xl font-bold ${isDark ? 'text-foreground' : 'text-slate-800'}`}>{stats?.total || 0}</div>
                        </div>
                        <div className={`p-4 rounded-xl border text-center transition-all hover:scale-105 duration-200 ${isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                            }`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Success</div>
                            <div className="text-2xl font-bold text-emerald-500">{stats?.successful || 0}</div>
                        </div>
                        <div className={`p-4 rounded-xl border text-center transition-all hover:scale-105 duration-200 ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
                            }`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Failed</div>
                            <div className="text-2xl font-bold text-red-500">{stats?.failed || 0}</div>
                        </div>
                        <div className={`p-4 rounded-xl border text-center transition-all hover:scale-105 duration-200 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                            }`}>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Processing</div>
                            <div className="text-2xl font-bold text-amber-500">{stats?.processing || 0}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground/40">
                            <span>Success Rate</span>
                            <span>{successRate.toFixed(1)}%</span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}>
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000 shadow-lg shadow-emerald-500/20"
                                style={{ width: `${successRate}%` }}
                            />
                        </div>
                    </div>

                    <div className={`rounded-xl p-4 border ${isDark ? 'bg-white/5 border-white/5' : 'bg-white border-slate-200'}`}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-foreground/40 mb-2">Batch identifier</div>
                        <div className="text-xs font-mono break-all text-foreground/60">{batchId}</div>
                    </div>
                </div>

                <div className={`p-6 border-t text-center ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}>
                    <button
                        onClick={onClose}
                        className={`w-full py-2.5 font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${isDark
                                ? 'bg-white text-black hover:bg-white/90'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        Close
                    </button>
                    <p className="mt-3 text-[10px] text-foreground/30 italic">Live updates every 5 seconds</p>
                </div>
            </div>
        </div>
    );
};

export default BatchStatsModal;
