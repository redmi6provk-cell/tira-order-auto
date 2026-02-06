"use client";

import React, { useState } from 'react';
import { Product, api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { Box, Plus, X, Trash2, ExternalLink } from 'lucide-react';

interface ProductManagerProps {
    products: Product[];
    onRefresh: () => void;
}

const ProductManager: React.FC<ProductManagerProps> = ({ products, onRefresh }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [isAdding, setIsAdding] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        name: '',
        url: '',
        price: 0,
        in_stock: true
    });

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.products.create(newProduct);
            setIsAdding(false);
            setNewProduct({ name: '', url: '', price: 0, in_stock: true });
            onRefresh();
        } catch (error) {
            console.error('Failed to add product:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.products.delete(id);
            onRefresh();
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    const inputClasses = `w-full rounded-xl border p-3 text-sm transition-all outline-none placeholder:text-foreground/30 ${isDark
            ? 'bg-[#1e1e2d] border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50'
            : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`;

    const labelClasses = "block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1.5";

    return (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl transition-all ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
                : 'bg-white/60 border-black/5 ring-1 ring-black/5'
            }`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
                }`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Box className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Product Manager</h3>
                        <p className="text-xs text-foreground/50 font-medium">{products.length} Products Configured</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-all transform active:scale-95 shadow-lg flex items-center gap-2 ${isAdding
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                        : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-emerald-500/20'
                        }`}
                >
                    {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {isAdding ? 'Cancel' : 'Add Product'}
                </button>
            </div>

            {isAdding && (
                <div className={`p-6 border-b animate-in slide-in-from-top-4 ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-slate-50/50 border-slate-100'
                    }`}>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Product Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    className={inputClasses}
                                    placeholder="e.g. Face Cream"
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Price (₹)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-foreground/40 font-bold">₹</span>
                                    <input
                                        type="number"
                                        required
                                        value={newProduct.price ?? ''}
                                        onChange={e =>
                                            setNewProduct({
                                                ...newProduct,
                                                price: e.target.value === '' ? 0 : parseFloat(e.target.value),
                                            })
                                        }
                                        className={`${inputClasses} pl-7`}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>Tira URL</label>
                            <input
                                type="url"
                                required
                                value={newProduct.url}
                                onChange={e => setNewProduct({ ...newProduct, url: e.target.value })}
                                className={inputClasses}
                                placeholder="https://www.tirabeauty.com/product/..."
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all transform active:scale-95 ${isDark
                                        ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                    }`}
                            >
                                Save Product
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead className={`sticky top-0 z-10 text-xs font-bold uppercase tracking-wider backdrop-blur-md ${isDark ? 'bg-[#1e1e2d]/90 text-foreground/50' : 'bg-white/90 text-foreground/50'
                        }`}>
                        <tr>
                            <th className="py-4 px-6">Product</th>
                            <th className="py-4 px-6 text-right">Price</th>
                            <th className="py-4 px-6 text-center">Status</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-white/5' : 'divide-slate-200'}`}>
                        {products.map(product => (
                            <tr key={product.id} className={`group transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                                }`}>
                                <td className="py-4 px-6">
                                    <div className="font-bold text-foreground group-hover:text-blue-500 transition-colors">{product.name}</div>
                                    <div className="flex items-center gap-1 mt-1 text-xs text-foreground/40 max-w-[300px] truncate">
                                        <ExternalLink className="w-3 h-3" />
                                        <a href={product.url} target="_blank" rel="noreferrer" className="hover:underline truncate">
                                            {product.url}
                                        </a>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-right font-mono font-bold text-foreground/80">
                                    ₹{product.price}
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide border ${product.in_stock
                                        ? (isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200')
                                        : (isDark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200')
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${product.in_stock ? 'bg-current' : 'bg-current'}`}></span>
                                        {product.in_stock ? 'IN STOCK' : 'OOS'}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className={`p-2 rounded-lg transition-colors ${isDark
                                                ? 'text-red-400 hover:bg-red-500/10'
                                                : 'text-red-500 hover:bg-red-50'
                                            }`}
                                        title="Delete Product"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-foreground/40 italic">
                                    No products managed yet. Click "Add Product" to start.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ProductManager;
