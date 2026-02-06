"use client";

import React from 'react';
import { Users } from 'lucide-react';
import { useTheme } from '@/libs/theme';

interface UserRangeSelectorProps {
    startId: number;
    endId: number;
    onStartChange: (id: number) => void;
    onEndChange: (id: number) => void;
}

const UserRangeSelector: React.FC<UserRangeSelectorProps> = ({
    startId,
    endId,
    onStartChange,
    onEndChange
}) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    const inputClasses = `font-mono text-lg w-full rounded-xl border p-3 outline-none transition-all ${isDark
            ? 'bg-[#0f111a] border-white/10 text-white focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50'
            : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
        }`;

    const labelClasses = "block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2";

    return (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl relative group transition-all duration-300 ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5 hover:border-indigo-500/30'
                : 'bg-white/60 border-black/5 ring-1 ring-black/5 hover:border-indigo-500/30'
            }`}>
            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500`}>
                <Users className="w-32 h-32 text-indigo-500" />
            </div>

            <div className="p-8 relative z-10">
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'
                            }`}>1</span>
                        Select User Range
                    </h3>
                    <p className="text-sm text-foreground/50 mt-1 ml-11 font-medium">Define the scope of users to process</p>
                </div>

                <div className="grid grid-cols-2 gap-6 relative z-10">
                    <div className="space-y-1">
                        <label className={labelClasses}>
                            Start User ID
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={startId}
                            onChange={(e) => onStartChange(Math.max(1, parseInt(e.target.value) || 1))}
                            className={inputClasses}
                            placeholder="1"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className={labelClasses}>
                            End User ID
                        </label>
                        <input
                            type="number"
                            min={startId}
                            value={endId}
                            onChange={(e) => onEndChange(Math.max(startId, parseInt(e.target.value) || startId))}
                            className={inputClasses}
                            placeholder="10"
                        />
                    </div>
                </div>

                <div className={`mt-8 flex items-center justify-between p-4 rounded-xl border relative z-10 transition-colors ${isDark
                        ? 'bg-indigo-500/5 border-indigo-500/10'
                        : 'bg-indigo-50/50 border-indigo-100'
                    }`}>
                    <div className="text-sm font-medium text-foreground/70">
                        Total Users in Scope
                    </div>
                    <div className={`text-2xl font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'
                        }`}>
                        {endId - startId + 1}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserRangeSelector;
