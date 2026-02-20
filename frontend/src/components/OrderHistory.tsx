"use client";

import React, { useState } from 'react';
import { Order, api } from '@/libs/api';
import LogModal from './LogModal';
import BatchStatsModal from './BatchStatsModal';
import ActionModal from './ui/ActionModal';
import { useTheme } from '@/libs/theme';
import { Trash2, FileText, BarChart2, CheckCircle2, XCircle, Clock, Activity, Loader2 } from 'lucide-react';

interface OrderHistoryProps {
    orders: Order[];
}

const OrderHistory: React.FC<OrderHistoryProps> = ({ orders }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [isClearing, setIsClearing] = useState(false);
    const [showClearAllModal, setShowClearAllModal] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const handleClearAll = async () => {
        setShowClearAllModal(true);
    };

    const confirmClearAll = async () => {
        setShowClearAllModal(false);
        setIsClearing(true);
        try {
            await api.orders.clearAll();
            window.location.reload();
        } catch (error) {
            console.error('Failed to clear history:', error);
            alert('Failed to clear history');
        } finally {
            setIsClearing(false);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        setOrderToDelete(orderId);
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;

        setIsDeleting(orderToDelete);
        try {
            await api.orders.deleteOrder(orderToDelete);
            window.location.reload();
        } catch (error) {
            console.error('Failed to delete order:', error);
            alert('Failed to delete order');
        } finally {
            setIsDeleting(null);
            setOrderToDelete(null);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return isDark
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'failed': return isDark
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-red-100 text-red-700 border-red-200';
            case 'processing': return isDark
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                : 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse';
            case 'pending': return isDark
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-amber-100 text-amber-700 border-amber-200';
            default: return isDark
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-slate-100 text-slate-500 border-slate-200';
        }
    };

    const stats = {
        total: orders.length,
        success: orders.filter(o => o.status === 'completed').length,
        failed: orders.filter(o => o.status === 'failed').length,
        processing: orders.filter(o => o.status === 'processing' || o.status === 'pending').length
    };

    interface StatCardProps {
        title: string;
        value: number;
        colorClass: string;
        icon: React.ElementType;
    }

    const StatCard = ({ title, value, colorClass, icon: Icon }: StatCardProps) => (
        <div className={`p-6 rounded-2xl border backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-lg ${isDark
            ? 'bg-[#1e1e2d]/60 border-white/5 hover:bg-white/5'
            : 'bg-white/60 border-slate-200 hover:bg-white'
            }`}>
            <div className="flex items-center justify-between mb-4">
                <div className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-foreground/40' : 'text-slate-500'
                    }`}>{title}</div>
                <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div className="text-3xl font-bold text-foreground">{value}</div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <ActionModal
                isOpen={showClearAllModal}
                title="Clear All History"
                message="Are you sure you want to delete all execution history? This will remove all orders, logs, and batch records. This action cannot be undone."
                confirmText="Clear All"
                onConfirm={confirmClearAll}
                onCancel={() => setShowClearAllModal(false)}
                isLoading={isClearing}
                variant="danger"
            />

            <ActionModal
                isOpen={!!orderToDelete}
                title="Delete Order Record"
                message="Are you sure you want to delete this specific order record? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDeleteOrder}
                onCancel={() => setOrderToDelete(null)}
                isLoading={!!isDeleting && isDeleting === orderToDelete}
                variant="danger"
            />
            {/* Summary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                    title="Total Executions"
                    value={stats.total}
                    colorClass={isDark ? "bg-indigo-500/20 text-indigo-400" : "bg-indigo-100 text-indigo-600"}
                    icon={Activity}
                />
                <StatCard
                    title="Successful"
                    value={stats.success}
                    colorClass={isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"}
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Failed"
                    value={stats.failed}
                    colorClass={isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}
                    icon={XCircle}
                />
                <StatCard
                    title="In Progress"
                    value={stats.processing}
                    colorClass={isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}
                    icon={Clock}
                />
            </div>

            <div className={`rounded-3xl border overflow-hidden shadow-2xl backdrop-blur-xl ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5'
                : 'bg-white/60 border-slate-200 shadow-slate-200/50'
                }`}>
                {/* Table Header Wrapper */}
                <div className={`p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
                    }`}>
                    <div>
                        <h3 className="text-2xl font-bold text-foreground">Execution History</h3>
                        <p className="text-sm text-foreground/50 mt-1 font-medium">Audit trail of all automated sessions</p>
                    </div>
                    <button
                        onClick={handleClearAll}
                        disabled={isClearing || orders.length === 0}
                        className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl border transition-all disabled:opacity-30 flex items-center justify-center gap-2 transform active:scale-95 ${isDark
                            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                            : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                            }`}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear History</span>
                    </button>
                </div>

                {/* Structured Table Container */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 border-b ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                }`}>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5">Order Details</th>
                                <th className="px-8 py-5">Target Profile</th>
                                <th className="px-8 py-5">Amount</th>
                                <th className="px-8 py-5">Created At</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-100'}`}>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-4 opacity-30">
                                            <div className={`p-6 rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                                                <FileText className="w-12 h-12" />
                                            </div>
                                            <p className="text-sm font-bold uppercase tracking-wider">No execution history found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id} className={`transition-colors group ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                                        }`}>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider shadow-sm ${getStatusStyles(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-xs font-mono font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'
                                                    }`}>#{order.id.slice(0, 8)}</span>
                                                <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-wider">
                                                    {order.payment_method}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-sm font-bold text-foreground/80">
                                                {order.profile_name || 'Individual Session'}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap text-sm font-mono font-bold text-foreground">
                                            ₹{order.total}
                                        </td>
                                        <td className="px-8 py-6 whitespace-nowrap">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs font-bold text-foreground/60">
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-[10px] text-foreground/30 font-medium">
                                                    {new Date(order.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end space-x-3">
                                                <button
                                                    onClick={() => setSelectedOrderId(order.id)}
                                                    className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${isDark
                                                        ? 'bg-secondary/20 hover:bg-secondary/40 text-foreground/70 border-white/10'
                                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm'
                                                        }`}
                                                    title="View Logs"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                {order.batch_id && (
                                                    <button
                                                        onClick={() => setSelectedBatchId(order.batch_id!)}
                                                        className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${isDark
                                                            ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200'
                                                            }`}
                                                        title="Batch Stats"
                                                    >
                                                        <BarChart2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className={`p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 ${isDark
                                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                                        : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                                                        }`}
                                                    title="Delete Order"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {selectedOrderId && (
                <LogModal
                    orderId={selectedOrderId}
                    onClose={() => setSelectedOrderId(null)}
                />
            )}

            {selectedBatchId && (
                <BatchStatsModal
                    batchId={selectedBatchId}
                    onClose={() => setSelectedBatchId(null)}
                />
            )}
        </div>
    );
};

export default OrderHistory;
