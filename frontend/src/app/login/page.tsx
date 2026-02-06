'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/libs/api';
import { LogIn, Lock, User, AlertCircle, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Check if already logged in
    useEffect(() => {
        if (api.auth.isAuthenticated()) {
            router.push('/');
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await api.auth.login(username, password);
            router.push('/');
        } catch (err: any) {
            setError('Invalid credentials. Please try again.');
            console.error('Login error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a16] flex items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo Section */}
                <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg shadow-blue-500/20 relative group">
                        <LogIn className="w-8 h-8 text-white group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-white/20 rounded-2xl blur-sm group-hover:blur-md transition-all"></div>
                        <div className="absolute -top-1 -right-1">
                            <Sparkles className="w-4 h-4 text-yellow-400 animate-bounce" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300 mb-2 tracking-tight">
                        TIRA AUTOMATION
                    </h1>
                    <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
                        Ultimate Control Center
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-8 border border-white/[0.08] shadow-2xl relative overflow-hidden group hover:border-white/[0.12] transition-colors duration-500">
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.02] to-purple-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center space-x-3 text-sm animate-in zoom-in-95 duration-300">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-widest ml-1">
                                Username or Email
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                                    <User className="w-5 h-5" />
                                </span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all duration-300 placeholder:text-white/10"
                                    placeholder="Enter your credentials"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-blue-400 transition-colors">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/[0.08] text-white rounded-xl py-3.5 pl-12 pr-4 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all duration-300 placeholder:text-white/10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                        >
                            <div className="relative z-10 flex items-center justify-center space-x-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Authenticating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Authorized Entry</span>
                                        <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                    </form>

                    {/* Glowing indicator */}
                    <div className="mt-8 pt-6 border-t border-white/[0.05] text-center">
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                            <span className="text-[10px] font-bold text-blue-400/80 uppercase tracking-tighter">System Ready for Authorization</span>
                        </div>
                    </div>
                </div>

                {/* Footer Credits */}
                <p className="text-center mt-8 text-white/20 text-[10px] font-mono tracking-[0.2em] uppercase">
                    &copy; 2026 Antigravity Systems &bull; Secure Protocol Activated
                </p>
            </div>
        </div>
    );
}
