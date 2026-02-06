import React, { useState } from 'react';
import { api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle2, XCircle } from 'lucide-react';

interface Card {
    id: string;
    card_name: string;
    bank_name: string;
    card_number: string;
    expiry_date: string;
    cvv: string;
    is_default: boolean;
    created_at?: string;
    updated_at?: string;
}

interface CardManagerProps {
    cards: Card[];
    onRefresh: () => void;
}

const CardManager: React.FC<CardManagerProps> = ({ cards, onRefresh }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Card>>({
        card_name: '',
        bank_name: '',
        card_number: '',
        expiry_date: '',
        cvv: '',
        is_default: false
    });

    const resetForm = () => {
        setFormData({
            card_name: '',
            bank_name: '',
            card_number: '',
            expiry_date: '',
            cvv: '',
            is_default: false
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.cards.update(editingId, formData);
            } else {
                await api.cards.create(formData);
            }
            resetForm();
            onRefresh();
        } catch (error) {
            console.error('Failed to save card:', error);
        }
    };

    const handleEdit = (card: Card) => {
        setFormData(card);
        setEditingId(card.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this card?')) return;
        try {
            await api.cards.delete(id);
            onRefresh();
        } catch (error) {
            console.error('Failed to delete card:', error);
        }
    };

    const handleToggleDefault = async (card: Card) => {
        try {
            await api.cards.update(card.id, {
                ...card,
                is_default: !card.is_default
            });
            onRefresh();
        } catch (error) {
            console.error('Failed to update default card:', error);
        }
    };

    const maskCardNumber = (number: string) => {
        if (!number) return '';
        const last4 = number.slice(-4);
        return `•••• •••• •••• ${last4}`;
    };

    const inputClasses = `mt-1 w-full rounded-xl border p-3 text-sm transition-all outline-none placeholder:text-foreground/30 ${isDark
        ? 'bg-[#1e1e2d] border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50'
        : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`;

    return (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl transition-all ${isDark
            ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
            : 'bg-white/60 border-black/5 ring-1 ring-black/5'
            }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
                }`}>
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <CreditCard className={`w-5 h-5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                    Card Manager
                </h3>
                <button
                    onClick={() => {
                        if (isAdding) {
                            resetForm();
                        } else {
                            setIsAdding(true);
                        }
                    }}
                    className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-all transform active:scale-95 shadow-lg flex items-center gap-2 ${isAdding
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:shadow-blue-500/20'
                        }`}
                >
                    {isAdding ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAdding ? 'Cancel' : 'Add Card'}
                </button>
            </div>

            {isAdding && (
                <div className="p-6 border-b border-border/50 animate-slide-up">
                    <form onSubmit={handleSubmit} className={`space-y-4 rounded-xl p-6 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Card Name</label>
                            <input
                                type="text"
                                required
                                value={formData.card_name}
                                onChange={e => setFormData({ ...formData, card_name: e.target.value })}
                                className={inputClasses}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Bank Name</label>
                            <input
                                type="text"
                                required
                                value={formData.bank_name}
                                onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                className={inputClasses}
                                placeholder="HDFC Bank"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Card Number</label>
                            <input
                                type="text"
                                required
                                pattern="\d{13,19}"
                                value={formData.card_number}
                                onChange={e => setFormData({ ...formData, card_number: e.target.value.replace(/\s/g, '') })}
                                className={inputClasses}
                                placeholder="1234567890123456"
                                maxLength={19}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Expiry Date</label>
                                <input
                                    type="text"
                                    required
                                    pattern="\d{2}/\d{4}"
                                    value={formData.expiry_date}
                                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                    className={inputClasses}
                                    placeholder="MM/YYYY"
                                    maxLength={7}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">CVV</label>
                                <input
                                    type="text"
                                    required
                                    pattern="\d{3,4}"
                                    value={formData.cvv}
                                    onChange={e => setFormData({ ...formData, cvv: e.target.value })}
                                    className={inputClasses}
                                    placeholder="123"
                                    maxLength={4}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-transparent"
                            />
                            <label htmlFor="is_default" className="text-sm font-medium text-foreground cursor-pointer select-none">Set as default card</label>
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all transform active:scale-[0.99] mt-2"
                        >
                            {editingId ? 'Update Card' : 'Save Card'}
                        </button>
                    </form>
                </div>
            )}

            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-6">
                <div className="space-y-4">
                    {cards.map(card => (
                        <div
                            key={card.id}
                            className={`group p-5 rounded-xl border transition-all hover:scale-[1.01] ${isDark
                                ? 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/30'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                        <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                            <CreditCard className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm">{card.card_name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-foreground/50">{card.bank_name}</span>
                                                {card.is_default && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-[52px]">
                                        <p className="text-sm text-foreground/70 leading-relaxed font-medium font-mono">
                                            {maskCardNumber(card.card_number)}
                                        </p>
                                        <p className="text-xs text-foreground/50 mt-1">
                                            Expires: {card.expiry_date}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                    <button
                                        onClick={() => handleToggleDefault(card)}
                                        className={`p-2 rounded-lg transition-colors ${card.is_default
                                            ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                            }`}
                                        title={card.is_default ? "Remove Default" : "Set Default"}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(card)}
                                        className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                        title="Edit Card"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                        title="Delete Card"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CardManager;
