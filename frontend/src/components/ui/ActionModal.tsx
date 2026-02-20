import React from 'react';
import { Loader2, AlertTriangle, Info, Trash2, StopCircle, X } from 'lucide-react';
import { useTheme } from '@/libs/theme';

export type ModalVariant = 'danger' | 'warning' | 'info';

interface ActionModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: ModalVariant;
    isLoading?: boolean;
}

const ActionModal: React.FC<ActionModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    variant = 'info',
    isLoading = false
}) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <Trash2 className="w-6 h-6 text-red-500" />,
                    button: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20',
                    bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
                    border: isDark ? 'border-red-500/20' : 'border-red-200'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
                    button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20',
                    bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
                    border: isDark ? 'border-amber-500/20' : 'border-amber-200'
                };
            default:
                return {
                    icon: <Info className="w-6 h-6 text-blue-500" />,
                    button: 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20',
                    bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
                    border: isDark ? 'border-blue-500/20' : 'border-blue-200'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div
                className={`relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl animate-in zoom-in-95 fade-in duration-300 ease-out-expo ${isDark ? 'bg-[#1e1e2d] border-white/10' : 'bg-white border-slate-200'
                    }`}
            >
                <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                        <div className={`p-3 rounded-2xl ${styles.bg} ${styles.border} border`}>
                            {styles.icon}
                        </div>
                        <button
                            onClick={onCancel}
                            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/5 text-slate-500' : 'hover:bg-slate-100 text-slate-400'
                                }`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h3 className={`text-xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {message}
                    </p>

                    <div className="flex items-center gap-3 mt-10">
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${isDark
                                    ? 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-6 py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${styles.button}`}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : null}
                            {isLoading ? 'Processing...' : confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ActionModal;
