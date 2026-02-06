import React, { useState } from 'react';
import { Address, api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { MapPin, Plus, Edit2, Trash2, Home, Building2, CheckCircle2 } from 'lucide-react';

interface AddressManagerProps {
    addresses: Address[];
    onRefresh: () => void;
}

const AddressManager: React.FC<AddressManagerProps> = ({ addresses, onRefresh }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Address>>({
        full_name: '',
        flat_number: '',
        street: '',
        city: '',
        state: '',
        pincode: '',
        is_default: false
    });

    const resetForm = () => {
        setFormData({
            full_name: '',
            flat_number: '',
            street: '',
            city: '',
            state: '',
            pincode: '',
            is_default: false
        });
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.addresses.update(editingId, formData);
            } else {
                await api.addresses.create(formData);
            }
            resetForm();
            onRefresh();
        } catch (error) {
            console.error('Failed to save address:', error);
        }
    };

    const handleEdit = (address: Address) => {
        setFormData(address);
        setEditingId(address.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this address?')) return;
        try {
            await api.addresses.delete(id);
            onRefresh();
        } catch (error) {
            console.error('Failed to delete address:', error);
        }
    };

    const handleToggleDefault = async (address: Address) => {
        try {
            await api.addresses.update(address.id, {
                ...address,
                is_default: !address.is_default
            });
            onRefresh();
        } catch (error) {
            console.error('Failed to update default address:', error);
        }
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
                    <MapPin className={`w-5 h-5 ${isDark ? 'text-blue-500' : 'text-blue-600'}`} />
                    Address Manager
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
                    {isAdding ? <XCircle /> : <Plus className="w-4 h-4" />}
                    {isAdding ? 'Cancel' : 'Add Address'}
                </button>
            </div>

            {isAdding && (
                <div className="p-6 border-b border-border/50 animate-slide-up">
                    <form onSubmit={handleSubmit} className={`space-y-4 rounded-xl p-6 border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                className={inputClasses}
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Flat / Building</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.flat_number}
                                    onChange={e => setFormData({ ...formData, flat_number: e.target.value })}
                                    className={inputClasses}
                                    placeholder="13A-1004"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Pincode</label>
                                <input
                                    type="text"
                                    required
                                    pattern="\d{6}"
                                    value={formData.pincode}
                                    onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                    className={inputClasses}
                                    placeholder="400001"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1">Street / Locality</label>
                            <input
                                type="text"
                                value={formData.street || ''}
                                onChange={e => setFormData({ ...formData, street: e.target.value })}
                                className={inputClasses}
                                placeholder="Locality, City"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_default"
                                checked={formData.is_default}
                                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-transparent"
                            />
                            <label htmlFor="is_default" className="text-sm font-medium text-foreground cursor-pointer select-none">Set as default address</label>
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 py-3 text-sm font-bold text-white hover:shadow-lg hover:shadow-blue-500/20 transition-all transform active:scale-[0.99] mt-2"
                        >
                            {editingId ? 'Update Address' : 'Save Address'}
                        </button>
                    </form>
                </div>
            )}

            <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar p-6">
                <div className="space-y-4">
                    {addresses.map(address => (
                        <div
                            key={address.id}
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
                                            <Home className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground text-sm">{address.full_name}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-foreground/50">{address.pincode}</span>
                                                {address.is_default && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        DEFAULT
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-[52px]">
                                        <p className="text-sm text-foreground/70 leading-relaxed font-medium">
                                            {address.flat_number}
                                            {address.street && `, ${address.street}`}
                                        </p>
                                        <p className="text-sm text-foreground/50">
                                            {address.city}, {address.state}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                    <button
                                        onClick={() => handleToggleDefault(address)}
                                        className={`p-2 rounded-lg transition-colors ${address.is_default
                                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                            }`}
                                        title={address.is_default ? "Remove Default" : "Set Default"}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleEdit(address)}
                                        className="p-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                                        title="Edit Address"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(address.id)}
                                        className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                                        title="Delete Address"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Helper to fix undefined XCircle if logic needs it, though we imported it implicitly via icon swap logic or just text */}
        </div>
    );
};

function XCircle() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
    )
}

export default AddressManager;
