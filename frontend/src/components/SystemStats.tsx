import React from 'react';
import { useTheme } from '@/libs/theme';
import { useSystemStats } from '@/hooks/useSystemStats';
import { Cpu, Server, Activity } from 'lucide-react';

const SystemStats: React.FC = () => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    // Initialize from localStorage or default to true
    const [isEnabled, setIsEnabled] = React.useState(true);

    React.useEffect(() => {
        const stored = localStorage.getItem('systemStatsEnabled');
        if (stored !== null) {
            setIsEnabled(stored === 'true');
        }
    }, []);

    const toggleStats = () => {
        const newState = !isEnabled;
        setIsEnabled(newState);
        localStorage.setItem('systemStatsEnabled', String(newState));
    };

    const { stats, isConnected } = useSystemStats(isEnabled);

    // If disabled, show a collapsed or minimal view
    if (!isEnabled) {
        return (
            <div className={`p-4 rounded-2xl border backdrop-blur-xl transition-all ${isDark
                    ? 'bg-[#1e1e2d]/60 border-white/5'
                    : 'bg-white/60 border-slate-200'
                }`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-slate-500/20 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                            <Activity className="w-5 h-5 opacity-50" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">System Monitor</h3>
                            <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Paused</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleStats}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isDark
                                ? 'bg-white/5 border-white/10 hover:bg-white/10 text-foreground/60'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                    >
                        Enable
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) return (
        <div className={`p-6 rounded-2xl border backdrop-blur-xl transition-all ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5'
                : 'bg-white/60 border-slate-200'
            }`}>
            <div className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className="space-y-2">
                        <div className={`w-24 h-3 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                        <div className={`w-16 h-2 rounded ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    </div>
                </div>
            </div>
        </div>
    );

    const cpuColor = stats.cpu > 80 ? 'bg-red-500' : stats.cpu > 50 ? 'bg-amber-500' : 'bg-emerald-500';
    const ramColor = stats.memory.percent > 80 ? 'bg-red-500' : stats.memory.percent > 50 ? 'bg-amber-500' : 'bg-blue-500';

    return (
        <div className={`p-6 rounded-2xl border backdrop-blur-xl transition-all ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5 shadow-lg'
                : 'bg-white/60 border-slate-200 shadow-xl shadow-slate-200/50'
            }`}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">System Health</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">
                                {isConnected ? 'Live Monitor' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={toggleStats}
                    className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isDark
                            ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-400'
                            : 'bg-red-50 border-red-200 hover:bg-red-100 text-red-600'
                        }`}
                >
                    Disable
                </button>
            </div>

            <div className="space-y-6">
                {/* CPU Usage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground/60">
                        <div className="flex items-center gap-2">
                            <Cpu className="w-3.5 h-3.5" />
                            <span>CPU Load</span>
                        </div>
                        <span>{stats.cpu.toFixed(1)}%</span>
                    </div>
                    <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${cpuColor}`}
                            style={{ width: `${stats.cpu}%` }}
                        />
                    </div>
                </div>

                {/* RAM Usage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-foreground/60">
                        <div className="flex items-center gap-2">
                            <Server className="w-3.5 h-3.5" />
                            <span>Memory Usage</span>
                        </div>
                        <span>{stats.memory.percent.toFixed(1)}%</span>
                    </div>
                    <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${ramColor}`}
                            style={{ width: `${stats.memory.percent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-foreground/40 mt-1">
                        <span>Used: {(stats.memory.used / (1024 ** 3)).toFixed(1)} GB</span>
                        <span>Total: {(stats.memory.total / (1024 ** 3)).toFixed(1)} GB</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemStats;
