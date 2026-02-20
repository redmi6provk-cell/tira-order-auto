import React, { useEffect, useMemo, useState } from 'react';
import { api, Order } from '@/libs/api';
import { X, CheckCircle, AlertCircle, Loader2, Users, Repeat, ShoppingBag, DollarSign, Activity, Download, Trash2 } from 'lucide-react';
import { useTheme } from '@/libs/theme';
import ActionModal from './ui/ActionModal';

interface AccountResultsModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId?: string | null;
}

const AccountResultsModal: React.FC<AccountResultsModalProps> = ({ isOpen, onClose, batchId }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen, batchId]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await api.orders.getAll();
            let data = Array.isArray(res) ? res : res.data || [];

            if (batchId) {
                data = data.filter((o: Order) => o.batch_id === batchId);
            }

            // Sort by User ID then Created At
            data.sort((a: Order, b: Order) => {
                const userA = a.tira_user_id || 0;
                const userB = b.tira_user_id || 0;
                if (userA !== userB) return Number(userA) - Number(userB);
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            setOrders(data);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
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
            // Update local state instead of full re-fetch for better UX
            setOrders(prev => prev.filter(o => o.id !== orderToDelete));
        } catch (error) {
            console.error("Failed to delete order:", error);
            alert("Failed to delete order");
        } finally {
            setIsDeleting(null);
            setOrderToDelete(null);
        }
    };

    const downloadCSV = () => {
        if (!orders.length) return;

        const headers = ['Account ID', 'Order ID', 'Date', 'Amount', 'Items', 'Shipping Name', 'Shipping Address', 'Pincode', 'Status', 'Message'];
        const rows = orders.map(order => {
            const addr = order.address || {};
            const addressParts = [
                addr.flat_number,
                addr.street,
                addr.city,
                addr.state
            ].filter(Boolean).join(', ');

            return [
                order.tira_user_id || order.profile_name || 'N/A',
                `"${(order.tira_order_number || 'PF-PENDING')}"`,
                `"${new Date(order.created_at).toLocaleString()}"`,
                order.total || 0,
                order.products?.length || 0,
                `"${(addr.full_name || '').replace(/"/g, '""')}"`,
                `"${addressParts.replace(/"/g, '""')}"`,
                `"${addr.pincode || ''}"`,
                `"${order.status}"`,
                `"${(order.error_message || '').replace(/"/g, '""')}"`
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `automation_results_${batchId || 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const stats = useMemo(() => {
        if (!orders.length) return null;

        const uniqueUsers = new Set(orders.map(o => o.tira_user_id)).size;
        const totalOrders = orders.length;
        const successful = orders.filter(o => o.status === 'completed').length;
        const failed = orders.filter(o => o.status === 'failed').length;
        // Average repetitions = Total Orders / Unique Users
        const avgRepetitions = uniqueUsers ? (totalOrders / uniqueUsers).toFixed(1) : 0;

        // Calculate max repetitions actually observed
        const userCounts: Record<string, number> = {};
        orders.forEach(o => {
            const uid = o.tira_user_id || 'unknown';
            userCounts[uid] = (userCounts[uid] || 0) + 1;
        });
        const maxRepetitions = Math.max(...Object.values(userCounts), 0);

        const totalValue = orders.reduce((acc, curr) => acc + (curr.total || 0), 0);

        return { uniqueUsers, totalOrders, successful, failed, maxRepetitions, totalValue };
    }, [orders]);

    // Group orders by User for display
    const groupedOrders = useMemo(() => {
        const groups: Record<string, Order[]> = {};
        orders.forEach(order => {
            const uid = order.tira_user_id || 'unknown';
            if (!groups[uid]) groups[uid] = [];
            groups[uid].push(order);
        });
        return groups;
    }, [orders]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <ActionModal
                isOpen={!!orderToDelete}
                title="Delete Order Record"
                message="Are you sure you want to delete this order record? This action cannot be undone."
                confirmText="Delete"
                onConfirm={confirmDeleteOrder}
                onCancel={() => setOrderToDelete(null)}
                isLoading={!!isDeleting && isDeleting === orderToDelete}
                variant="danger"
            />
            <div className={`w-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border ring-1 ring-black/5 overflow-hidden backdrop-blur-xl ${isDark
                ? 'bg-[#1e1e2d]/95 border-white/10'
                : 'bg-white/95 border-black/5'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b bg-gradient-to-r ${isDark
                    ? 'border-border/50 from-blue-500/10 to-purple-500/10'
                    : 'border-border/50 from-blue-500/5 to-purple-500/5'
                    }`}>
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'
                                }`}>
                                <Activity className={`w-5 h-5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                            </div>
                            Automation Results
                        </h2>
                        <p className="text-xs text-foreground/50 mt-1 font-mono ml-12">Batch ID: {batchId || 'All'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={downloadCSV}
                            disabled={loading || orders.length === 0}
                            className="bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold uppercase px-4 py-2.5 rounded-xl border border-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                        >
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-red-500/10 hover:text-red-500 rounded-full transition-all text-foreground/40 hover:rotate-90 duration-300"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-hidden flex flex-col ${isDark ? 'bg-transparent' : 'bg-slate-50/50'}`}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4 opacity-80" />
                            <p className="text-foreground/50 font-medium animate-pulse">Retrieving automation data...</p>
                        </div>
                    ) : (
                        <>
                            {/* Stats Summary Card */}
                            {stats && (
                                <div className="p-6 grid grid-cols-2 md:grid-cols-5 gap-4 border-b border-border/50">
                                    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group ${isDark
                                        ? 'bg-black/20 border-white/5'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-2 text-foreground/50 text-xs uppercase font-bold tracking-wider mb-2 group-hover:text-primary transition-colors">
                                            <Users className="w-3.5 h-3.5" /> Users
                                        </div>
                                        <div className="text-2xl font-bold text-foreground tracking-tight">{stats.uniqueUsers}</div>
                                    </div>
                                    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group ${isDark
                                        ? 'bg-black/20 border-white/5'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-2 text-foreground/50 text-xs uppercase font-bold tracking-wider mb-2 group-hover:text-primary transition-colors">
                                            <Repeat className="w-3.5 h-3.5" /> Repetitions
                                        </div>
                                        <div className="text-2xl font-bold text-foreground tracking-tight">{stats.maxRepetitions}<span className="text-xs font-normal text-foreground/30 ml-1">max</span></div>
                                    </div>
                                    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group ${isDark
                                        ? 'bg-black/20 border-white/5'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-2 text-foreground/50 text-xs uppercase font-bold tracking-wider mb-2 group-hover:text-primary transition-colors">
                                            <ShoppingBag className="w-3.5 h-3.5" /> Total Orders
                                        </div>
                                        <div className="text-2xl font-bold text-foreground tracking-tight">{stats.totalOrders}</div>
                                    </div>
                                    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group ${isDark
                                        ? 'bg-black/20 border-white/5'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-2 text-foreground/50 text-xs uppercase font-bold tracking-wider mb-2 group-hover:text-emerald-500 transition-colors">
                                            <CheckCircle className="w-3.5 h-3.5" /> Success Rate
                                        </div>
                                        <div className="flex gap-3 items-end">
                                            <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                                {stats.successful}
                                            </div>
                                            <div className={`text-xs font-bold mb-1.5 px-1.5 py-0.5 rounded border ${isDark
                                                ? 'text-red-500 bg-red-500/10 border-red-500/10'
                                                : 'text-red-600 bg-red-50 border-red-200'
                                                }`}>
                                                {stats.failed} Failed
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all group col-span-2 md:col-span-1 ${isDark
                                        ? 'bg-black/20 border-white/5'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className="flex items-center gap-2 text-foreground/50 text-xs uppercase font-bold tracking-wider mb-2 group-hover:text-blue-500 transition-colors">
                                            <DollarSign className="w-3.5 h-3.5" /> Total Value
                                        </div>
                                        <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                                            ₹{stats.totalValue.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Table */}
                            <div className="flex-1 overflow-auto p-0">
                                <table className="w-full text-left text-sm border-collapse">
                                    <thead className={`sticky top-0 z-10 backdrop-blur shadow-sm border-b border-border/50 ${isDark ? 'bg-[#1e1e2d]/95' : 'bg-white/80'
                                        }`}>
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-foreground/60 text-xs uppercase tracking-wider text-left">Account ID</th>
                                            <th className="px-4 py-4 font-bold text-foreground/60 text-center text-xs uppercase tracking-wider">Seq</th>
                                            <th className="px-6 py-4 font-bold text-foreground/60 text-xs uppercase tracking-wider text-left">Order Details</th>
                                            <th className="px-4 py-4 font-bold text-foreground/60 text-center text-xs uppercase tracking-wider">Items</th>
                                            <th className="px-6 py-4 font-bold text-foreground/60 text-right text-xs uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-4 font-bold text-foreground/60 text-xs uppercase tracking-wider text-left">Address</th>
                                            <th className="px-4 py-4 font-bold text-foreground/60 text-center text-xs uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 font-bold text-foreground/60 text-xs uppercase tracking-wider text-left">Message</th>
                                            <th className="px-4 py-4 font-bold text-foreground/60 text-center text-xs uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {Object.keys(groupedOrders).map(userId => {
                                            const group = groupedOrders[userId];
                                            const userSuccess = group.filter(o => o.status === 'completed').length;
                                            const successRate = (userSuccess / group.length) * 100;
                                            const isGoodUser = successRate === 100;

                                            return (
                                                <React.Fragment key={userId}>
                                                    {/* User Header Row */}
                                                    <tr className={`transition-colors ${isDark
                                                        ? 'bg-white/5 hover:bg-white/10'
                                                        : 'bg-slate-100/50 hover:bg-slate-100'
                                                        }`}>
                                                        <td colSpan={8} className="px-6 py-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-1.5 rounded-lg ${isGoodUser
                                                                        ? (isDark ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-50 text-emerald-600')
                                                                        : (isDark ? 'bg-amber-500/10 text-amber-500' : 'bg-amber-50 text-amber-600')
                                                                        }`}>
                                                                        <Users className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="font-bold text-foreground text-sm">User {userId}</span>
                                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide ${isDark
                                                                        ? 'bg-black/20 border-white/10 text-foreground/50'
                                                                        : 'bg-white border-black/5 text-foreground/50'
                                                                        }`}>
                                                                        {group.length} Orders
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-1.5 w-24 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/10'
                                                                        }`}>
                                                                        <div className={`h-full rounded-full ${isGoodUser
                                                                            ? 'bg-emerald-500'
                                                                            : 'bg-amber-500'
                                                                            }`} style={{ width: `${successRate}%` }}></div>
                                                                    </div>
                                                                    <div className="text-xs font-mono text-foreground/50">
                                                                        <span className={`font-bold ${isGoodUser
                                                                            ? (isDark ? 'text-emerald-500' : 'text-emerald-600')
                                                                            : (isDark ? 'text-amber-500' : 'text-amber-600')
                                                                            }`}>{userSuccess}/{group.length}</span> Success
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Order Rows */}
                                                    {group.map((order, idx) => {
                                                        const isSuccess = order.status === 'completed';
                                                        return (
                                                            <tr key={order.id} className={`transition-colors group ${isDark
                                                                ? 'bg-[#1e1e2d] hover:bg-white/5'
                                                                : 'bg-white hover:bg-slate-50'
                                                                }`}>
                                                                <td className="px-6 py-4 font-mono text-xs text-foreground/30 pl-10 border-l-2 border-transparent group-hover:border-primary/50 transition-colors">
                                                                    ↳
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <span className={`inline-block w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-mono text-foreground/60 border ${isDark
                                                                        ? 'bg-white/5 border-white/5'
                                                                        : 'bg-slate-100 border-black/5'
                                                                        }`}>
                                                                        {idx + 1}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className={`font-mono text-xs font-bold tracking-wide ${isDark ? 'text-blue-400' : 'text-blue-600'
                                                                            }`}>
                                                                            {order.tira_order_number || 'PF-PENDING'}
                                                                        </span>
                                                                        <span className="text-[10px] text-foreground/40 mt-0.5">
                                                                            {new Date(order.created_at).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-4 text-center font-medium text-foreground/70 text-sm">
                                                                    {order.products?.length || 0}
                                                                </td>
                                                                <td className="px-6 py-4 text-right font-mono text-sm font-medium text-foreground/90">
                                                                    {order.total ? `₹${order.total.toLocaleString()}` : '-'}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-foreground/60 max-w-[180px] truncate" title={order.address ? `${order.address.full_name}, ${order.address.city}` : ''}>
                                                                    {order.address?.pincode || <span className="text-foreground/20 italic">No Address</span>}
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    {isSuccess ? (
                                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${isDark
                                                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                                            }`}>
                                                                            SUCCESS
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${isDark
                                                                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                                                            : 'bg-red-100 text-red-700 border-red-200'
                                                                            }`}>
                                                                            FAILED
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 text-xs max-w-[280px]">
                                                                    {isSuccess ? (
                                                                        <span className={`flex items-center gap-1.5 font-medium ${isDark ? 'text-emerald-400/80' : 'text-emerald-600/80'
                                                                            }`}>
                                                                            <CheckCircle className="w-3 h-3" /> Order Confirmed
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`flex items-center gap-1.5 font-medium truncate max-w-full ${isDark ? 'text-red-400/90' : 'text-red-600/90'
                                                                            }`} title={order.error_message}>
                                                                            <AlertCircle className="w-3 h-3 shrink-0" />
                                                                            {order.error_message || 'Unknown error'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-4 text-center">
                                                                    <button
                                                                        onClick={() => handleDeleteOrder(order.id)}
                                                                        className={`p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95 ${isDark
                                                                            ? 'hover:bg-red-500/20 text-red-400/60 hover:text-red-400'
                                                                            : 'hover:bg-red-50 text-red-500/60 hover:text-red-600'
                                                                            }`}
                                                                        title="Delete Order"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {!loading && orders.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-24 text-foreground/30 space-y-4">
                                        <ShoppingBag className="w-12 h-12 opacity-20" />
                                        <div className="text-sm font-medium">No order data found</div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountResultsModal;
