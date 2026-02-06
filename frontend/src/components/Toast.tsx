"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/libs/theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    showError: (message: string) => void;
    showSuccess: (message: string) => void;
    showInfo: (message: string) => void;
    showWarning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
        const id = Math.random().toString(36).substring(7);
        const toast: Toast = { id, type, message, duration };

        setToasts((prev) => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const showError = useCallback((message: string) => showToast(message, 'error', 7000), [showToast]);
    const showSuccess = useCallback((message: string) => showToast(message, 'success', 4000), [showToast]);
    const showInfo = useCallback((message: string) => showToast(message, 'info', 5000), [showToast]);
    const showWarning = useCallback((message: string) => showToast(message, 'warning', 6000), [showToast]);

    const getToastStyles = (type: ToastType) => {
        switch (type) {
            case 'success':
                return isDark
                    ? 'bg-[#1e1e2d]/90 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20'
                    : 'bg-white/90 border-emerald-500 text-emerald-700 shadow-emerald-200';
            case 'error':
                return isDark
                    ? 'bg-[#1e1e2d]/90 border-red-500/50 text-red-400 shadow-red-500/20'
                    : 'bg-white/90 border-red-500 text-red-700 shadow-red-200';
            case 'warning':
                return isDark
                    ? 'bg-[#1e1e2d]/90 border-amber-500/50 text-amber-400 shadow-amber-500/20'
                    : 'bg-white/90 border-amber-500 text-amber-700 shadow-amber-200';
            case 'info':
            default:
                return isDark
                    ? 'bg-[#1e1e2d]/90 border-blue-500/50 text-blue-400 shadow-blue-500/20'
                    : 'bg-white/90 border-blue-500 text-blue-700 shadow-blue-200';
        }
    };

    const getToastIcon = (type: ToastType) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5" />;
            case 'error':
                return <AlertCircle className="w-5 h-5" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5" />;
            case 'info':
            default:
                return <Info className="w-5 h-5" />;
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showError, showSuccess, showInfo, showWarning }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md w-full px-4 sm:px-0">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              flex items-start gap-4 p-4 rounded-xl border shadow-xl
              backdrop-blur-md animate-in slide-in-from-right-full duration-300
              ${getToastStyles(toast.type)}
              group relative overflow-hidden
            `}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />

                        <div className="flex-shrink-0 mt-0.5 relative z-10">
                            {getToastIcon(toast.type)}
                        </div>
                        <p className="flex-1 text-sm font-semibold leading-relaxed relative z-10 shadow-sm">
                            {toast.message}
                        </p>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity relative z-10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
