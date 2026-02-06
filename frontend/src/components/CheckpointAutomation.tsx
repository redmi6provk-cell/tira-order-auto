import React, { useState, useEffect } from 'react';
import { api, CheckpointResult } from '@/libs/api';
import UserRangeSelector from './UserRangeSelector';
import { useTheme } from '@/libs/theme';
import { Play, Loader2, CheckCircle2, XCircle, LogOut, Info, Gift, Download } from 'lucide-react';

export default function CheckpointAutomation() {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [userRange, setUserRange] = useState({ start: 1, end: 10 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [results, setResults] = useState<CheckpointResult[]>([]);
    const [status, setStatus] = useState<any>(null);

    const handleStart = async () => {
        setIsProcessing(true);
        setResults([]);
        try {
            const response = await api.checkpoints.execute({
                user_range_start: userRange.start,
                user_range_end: userRange.end,
                concurrent_browsers: 3,
                headless: true
            });
            setTaskId(response.task_id);
        } catch (error) {
            console.error("Failed to start checkpoint automation:", error);
            setIsProcessing(false);
        }
    };

    const downloadCSV = () => {
        if (!results.length) return;

        const headers = ['User ID', 'Account Name', 'Email', 'Points', 'Status', 'Last Checked'];
        const rows = results.map(row => [
            row.user_id,
            `"${(row.account_name || 'N/A').replace(/"/g, '""')}"`,
            `"${(row.email || '').replace(/"/g, '""')}"`,
            row.points,
            row.status,
            `"${row.checked_at ? new Date(row.checked_at).toLocaleString() : ''}"`
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `checkpoint_results_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (taskId && isProcessing) {
            interval = setInterval(async () => {
                const [statusRes, resultsRes] = await Promise.all([
                    api.checkpoints.getStatus(taskId),
                    api.checkpoints.getResults(taskId)
                ]);

                setStatus(statusRes);
                setResults(resultsRes);

                if (statusRes.status === 'completed' || statusRes.status === 'failed') {
                    setIsProcessing(false);
                    setTaskId(null);
                }
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [taskId, isProcessing]);

    return (
        <div className="space-y-6">
            <div className={`rounded-2xl p-8 border relative overflow-hidden group transition-all ${isDark
                    ? 'bg-gradient-to-br from-[#1e1e2d] to-black/20 border-white/5 ring-1 ring-white/5'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}>
                <div className={`absolute inset-0 bg-gradient-to-br transition-opacity ${isDark ? 'from-blue-500/[0.05] to-purple-500/[0.02]' : 'from-blue-500/5 to-purple-500/5'
                    }`}></div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                    <Gift className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Treats Checkpoint</h2>
                                    <p className="text-xs text-foreground/40 font-mono mt-0.5">AUTOMATION_V2</p>
                                </div>
                            </div>
                            {results.length > 0 && (
                                <button
                                    onClick={downloadCSV}
                                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 ${isDark
                                            ? 'bg-white/5 hover:bg-white/10 text-foreground/70 border-white/5'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                >
                                    <Download className="w-3 h-3" /> Export CSV
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-foreground/60 max-w-md leading-relaxed">
                            Automated points extraction for Tira users. Selecting a range will launch secure browser sessions to verify account status and Treats balance.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <UserRangeSelector
                                startId={userRange.start}
                                endId={userRange.end}
                                onStartChange={(start) => setUserRange(prev => ({ ...prev, start }))}
                                onEndChange={(end) => setUserRange(prev => ({ ...prev, end }))}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-3">
                        <button
                            onClick={handleStart}
                            disabled={isProcessing}
                            className={`w-full md:w-48 py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 ${isProcessing
                                ? 'bg-secondary text-foreground/40 cursor-not-allowed transform-none'
                                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-blue-500/20'
                                }`}
                        >
                            {isProcessing ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5 fill-current" />
                            )}
                            <span>{isProcessing ? 'Processing...' : 'Run Automation'}</span>
                        </button>

                        {isProcessing && status && (
                            <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-2 animate-pulse ${isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
                                }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                Checking {status.progress} of {userRange.end - userRange.start + 1}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${isDark
                    ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
                    : 'bg-white/60 border-black/5 ring-1 ring-black/5'
                }`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50/80 border-slate-200'
                                }`}>
                                <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">User ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Profile</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-center">Earned Points</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Last Checked</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {results.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-30 text-foreground">
                                            <Info className="w-12 h-12" />
                                            <p className="text-sm font-medium">No results to display</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                results.sort((a, b) => a.user_id - b.user_id).map((result) => (
                                    <tr key={result.user_id} className={`transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                                        }`}>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-mono text-foreground/60 bg-foreground/5 px-1.5 py-0.5 rounded">#{result.user_id}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                                                    {result.account_name && result.account_name !== 'N/A' ? result.account_name : result.username || 'Unknown'}
                                                </span>
                                                <span className="text-[10px] text-foreground/40">{result.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${result.points !== 'N/A'
                                                ? isDark
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                                                : 'bg-secondary/50 text-foreground/30 border border-border/30'
                                                }`}>
                                                {result.points !== 'N/A' ? `${result.points} PTS` : '—'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center space-x-2">
                                                {result.status === 'success' && (
                                                    <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isDark
                                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                        }`}>
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>ACTIVE</span>
                                                    </span>
                                                )}
                                                {result.status === 'logged_out' && (
                                                    <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isDark
                                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                                        }`}>
                                                        <LogOut className="w-3 h-3" />
                                                        <span>EXPIRED</span>
                                                    </span>
                                                )}
                                                {result.status === 'failed' && (
                                                    <span className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isDark
                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                            : 'bg-red-50 text-red-600 border-red-200'
                                                        }`} title={result.error}>
                                                        <XCircle className="w-3 h-3" />
                                                        <span>ERROR</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] text-foreground/30 font-medium uppercase font-mono">
                                                {new Date(result.checked_at).toLocaleTimeString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
