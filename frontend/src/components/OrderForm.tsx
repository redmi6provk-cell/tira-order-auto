
"use client";

import React, { useState } from 'react';
import { Product, Address, api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { Plus, Trash2, ShoppingCart, Truck, CreditCard, Settings, AlertTriangle, Play, Loader2 } from 'lucide-react';

interface OrderFormProps {
    products: Product[];
    addresses: Address[];
    userRange: { start: number; end: number };
    onOrderStarted: (orderId: string) => void;
}

interface SelectedProduct {
    productId: string;
    quantity: number;
}

const OrderForm: React.FC<OrderFormProps> = ({
    products,
    addresses,
    userRange,
    onOrderStarted
}) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery');
    const [cards, setCards] = useState<any[]>([]);
    const [maxCartValue, setMaxCartValue] = useState<number>(0);
    const [concurrent, setConcurrent] = useState(1);
    const [repetitionCount, setRepetitionCount] = useState(1);
    const [nameSuffix, setNameSuffix] = useState('');
    const [headless, setHeadless] = useState(false);
    const [executionMode, setExecutionMode] = useState('full_automation');
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // Fetch cards when component mounts
    React.useEffect(() => {
        const fetchCards = async () => {
            try {
                const cardsData = await api.cards.getAll();
                setCards(Array.isArray(cardsData) ? cardsData : cardsData?.data ?? []);
            } catch (error) {
                console.error('Failed to fetch cards:', error);
            }
        };
        fetchCards();
    }, []);

    // Current product being added
    const [currentProductId, setCurrentProductId] = useState('');
    const [currentQuantity, setCurrentQuantity] = useState(1);

    const handleAddProduct = () => {
        if (!currentProductId) {
            alert('Please select a product');
            return;
        }

        // Check if product already exists
        const existingIndex = selectedProducts.findIndex(p => p.productId === currentProductId);

        if (existingIndex >= 0) {
            // Update existing product quantity
            const updated = [...selectedProducts];
            updated[existingIndex].quantity = currentQuantity;
            setSelectedProducts(updated);
        } else {
            // Add new product
            setSelectedProducts([...selectedProducts, {
                productId: currentProductId,
                quantity: currentQuantity
            }]);
        }

        // Reset form
        setCurrentProductId('');
        setCurrentQuantity(1);
    };

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
    };

    const getProductDetails = (productId: string) => {
        return products.find(p => p.id === productId);
    };

    const calculateTotal = () => {
        return selectedProducts.reduce((total, sp) => {
            const product = getProductDetails(sp.productId);
            return total + (product ? product.price * sp.quantity : 0);
        }, 0);
    };

    const handleProceedToConfirmation = () => {
        if (executionMode === 'full_automation') {
            if (selectedProducts.length === 0) {
                alert('Please add at least one product');
                return;
            }
            if (!selectedAddressId) {
                alert('Please select a delivery address');
                return;
            }
        }
        setShowConfirmation(true);
    };

    const handleConfirmOrder = async () => {
        setIsLoading(true);
        setShowConfirmation(false);

        try {
            if (executionMode === 'test_login') {
                const config = {
                    user_range_start: userRange.start,
                    user_range_end: userRange.end,
                    concurrent_browsers: concurrent,
                    headless: headless
                };
                const result = await api.automation.executeTestLogin(config);
                // For test login, we might not get an order ID, but let's assume result has some status
                // Or we can just alert success/check logs
                alert(result.message || 'Test Login Execution Started');
                return;
            }

            const orderProducts = selectedProducts.map(sp => {
                const product = getProductDetails(sp.productId);
                if (!product) throw new Error(`Product not found: ${sp.productId}`);

                return {
                    product_id: product.id,
                    product_name: product.name,
                    product_url: product.url,
                    quantity: sp.quantity,
                    price: product.price
                };
            });

            const config = {
                products: orderProducts,
                address_id: selectedAddressId,
                max_cart_value: maxCartValue > 0 ? maxCartValue : undefined,
                user_range_start: userRange.start,
                user_range_end: userRange.end,
                concurrent_browsers: concurrent,
                repetition_count: repetitionCount,
                name_suffix: nameSuffix || undefined,
                headless: headless,
                mode: executionMode,
                payment_method: paymentMethod,
                card_id: paymentMethod === 'card' ? selectedCardId : undefined
            };

            const result = await api.automation.execute(config);
            onOrderStarted(result.order_id);

            // Reset form after successful order
            setSelectedProducts([]);
            setSelectedAddressId('');
            setMaxCartValue(0);
        } catch (error) {
            console.error('Failed to start order:', error);
            alert('Failed to start order execution');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = `w-full rounded-xl border p-3 text-sm transition-all outline-none placeholder:text-foreground/30 ${isDark
        ? 'bg-[#1e1e2d] border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50'
        : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`;

    const labelClasses = "text-xs font-bold text-foreground/50 uppercase mb-1.5 block tracking-wider";

    return (
        <>
            <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl relative transition-all ${isDark
                ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
                : 'bg-white/60 border-black/5 ring-1 ring-black/5'
                }`}>
                <div className={`p-8 border-b ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
                    }`}>
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold shadow-lg ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                            }`}>2</span>
                        Configure Order
                    </h3>
                    <p className="text-sm text-foreground/50 mt-1 ml-11">Select products and delivery details</p>
                </div>

                <div className="p-8">
                    {/* Automation Settings */}
                    <div className={`mb-8 p-6 rounded-2xl border ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm mb-6">
                            <div className={`p-1.5 rounded-md ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                                <Settings className="w-4 h-4" />
                            </div>
                            Automation Config
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>Automation Mode</label>
                                <div className="relative">
                                    <select
                                        value={executionMode}
                                        onChange={e => setExecutionMode(e.target.value)}
                                        className={inputClasses}
                                    >
                                        <option value="full_automation">Full Automation (Order Execution)</option>
                                        <option value="test_login">Test Login Only (Verify Cookies)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>Concurrent Browsers</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={concurrent}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 1;
                                        if (val > 10) setConcurrent(10);
                                        else setConcurrent(val);
                                    }}
                                    className={inputClasses}
                                />
                            </div>
                            {executionMode === 'full_automation' && (
                                <div>
                                    <label className={labelClasses}>Repetitions Per User</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={repetitionCount}
                                        onChange={e => {
                                            const val = parseInt(e.target.value) || 1;
                                            setRepetitionCount(val < 1 ? 1 : val);
                                        }}
                                        className={inputClasses}
                                    />
                                </div>
                            )}
                            {executionMode === 'full_automation' && (
                                <div>
                                    <label className={labelClasses}>Name Suffix (Optional)</label>
                                    <input
                                        type="text"
                                        value={nameSuffix}
                                        onChange={e => setNameSuffix(e.target.value)}
                                        placeholder="e.g. bhai"
                                        className={inputClasses}
                                    />
                                </div>
                            )}
                            <div className="pt-6">
                                <label className={`flex cursor-pointer items-center space-x-3 select-none group p-3 rounded-xl border transition-all ${isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'
                                    }`}>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={headless}
                                            onChange={e => setHeadless(e.target.checked)}
                                            className="peer sr-only"
                                        />
                                        <div className={`h-6 w-11 rounded-full transition-colors ${isDark ? 'bg-white/10 peer-checked:bg-blue-500' : 'bg-slate-300 peer-checked:bg-blue-600'
                                            }`}></div>
                                        <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                                    </div>
                                    <span className="text-sm font-bold text-foreground group-hover:text-blue-500 transition-colors">Headless Mode</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Add Product Section */}
                    <div className={`space-y-6 mb-8 ${executionMode !== 'full_automation' ? 'hidden' : ''}`}>
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                            <div className={`p-1.5 rounded-md ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                <ShoppingCart className="w-4 h-4" />
                            </div>
                            Add Products
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <select
                                    value={currentProductId}
                                    onChange={e => setCurrentProductId(e.target.value)}
                                    className={inputClasses}
                                >
                                    <option value="">Choose a product...</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (₹{p.price})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="w-full md:w-32">
                                <input
                                    type="number"
                                    min="1"
                                    value={currentQuantity}
                                    onChange={e => setCurrentQuantity(parseInt(e.target.value) || 1)}
                                    className={`${inputClasses} text-center`}
                                    placeholder="Qty"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={handleAddProduct}
                                className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center ${isDark
                                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                    }`}
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Selected Products List */}
                    {selectedProducts.length > 0 && executionMode === 'full_automation' && (
                        <div className="mb-8 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50'
                                }`}>
                                {selectedProducts.map((sp, index) => {
                                    const product = getProductDetails(sp.productId);
                                    if (!product) return null;

                                    const itemTotal = product.price * sp.quantity;

                                    return (
                                        <div key={sp.productId} className={`flex items-center justify-between p-4 ${index !== 0 ? (isDark ? 'border-t border-white/5' : 'border-t border-slate-200') : ''
                                            }`}>
                                            <div className="flex-1">
                                                <p className="font-bold text-foreground text-sm">{product.name}</p>
                                                <p className="text-xs text-foreground/50 mt-1 font-mono">
                                                    ₹{product.price} × {sp.quantity}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="font-bold text-foreground text-sm font-mono">₹{itemTotal.toFixed(2)}</span>
                                                <button
                                                    onClick={() => handleRemoveProduct(sp.productId)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className={`p-4 flex justify-between items-center border-t ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'
                                    }`}>
                                    <span className="text-sm font-bold text-foreground/70 uppercase tracking-wider">Subtotal</span>
                                    <span className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                        ₹{calculateTotal().toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment & Settings */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${executionMode !== 'full_automation' ? 'hidden' : ''}`}>
                        {/* Address Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                <div className={`p-1.5 rounded-md ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                                    <Truck className="w-4 h-4" />
                                </div>
                                Delivery Details
                            </div>
                            <select
                                required
                                value={selectedAddressId}
                                onChange={e => setSelectedAddressId(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="">Select Delivery Address...</option>
                                {addresses.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.full_name} - {a.flat_number}, {a.city}
                                    </option>
                                ))}
                            </select>

                            <div className="relative">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <span className="text-foreground/40 font-bold">₹</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    value={maxCartValue || ''}
                                    onChange={e => setMaxCartValue(parseFloat(e.target.value) || 0)}
                                    className={`${inputClasses} pl-8`}
                                    placeholder="Max Cart Value (Optional)"
                                />
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                <div className={`p-1.5 rounded-md ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                                    <CreditCard className="w-4 h-4" />
                                </div>
                                Payment Method
                            </div>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className={inputClasses}
                            >
                                <option value="cash_on_delivery">Cash on Delivery</option>
                                <option value="card">Credit/Debit Card</option>
                                <option value="upi" disabled>UPI (Coming Soon)</option>
                            </select>

                            {/* Card Selection */}
                            {paymentMethod === 'card' && (
                                <div className={`mt-4 animate-in slide-in-from-top-2`}>
                                    <label className={labelClasses}>Select Card</label>
                                    <select
                                        value={selectedCardId}
                                        onChange={(e) => setSelectedCardId(e.target.value)}
                                        className={inputClasses}
                                        required
                                    >
                                        <option value="">Choose a saved card...</option>
                                        {cards.map(card => (
                                            <option key={card.id} value={card.id}>
                                                {card.card_name} - {card.bank_name} (••••  {card.card_number.slice(-4)})
                                            </option>
                                        ))}
                                    </select>
                                    {cards.length === 0 && (
                                        <p className="text-xs text-yellow-500 mt-2">
                                            No saved cards found. Please add a card in the Cards tab first.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleProceedToConfirmation}
                        disabled={isLoading || (executionMode === 'full_automation' && (selectedProducts.length === 0 || !selectedAddressId))}
                        className={`w-full rounded-xl py-4 text-sm font-bold text-white shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${isLoading || (executionMode === 'full_automation' && (selectedProducts.length === 0 || !selectedAddressId))
                            ? 'bg-slate-700/50 cursor-not-allowed text-white/50 shadow-none'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 shadow-blue-500/20'
                            }`}
                    >
                        {executionMode === 'full_automation' ? 'Prepare Order Review' : 'Try Test Login'}
                    </button>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border animate-in slide-in-from-bottom-8 duration-300 no-scrollbar ${isDark
                        ? 'bg-[#1e1e2d] border-white/10'
                        : 'bg-white border-slate-200'
                        }`}>
                        <div className={`p-8 border-b sticky top-0 z-10 backdrop-blur-xl ${isDark ? 'border-white/5 bg-[#1e1e2d]/90' : 'border-slate-100 bg-white/90'
                            }`}>
                            <h2 className="text-2xl font-bold text-foreground">Confirm Execution</h2>
                            <p className="text-sm text-foreground/50 mt-1">Double check all details before launching automation.</p>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Summary Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                    }`}>
                                    <div className="text-xs font-bold text-foreground/40 uppercase mb-2 tracking-wider">Target Scope</div>
                                    <div className="text-2xl font-bold text-foreground">{userRange.end - userRange.start + 1} Users</div>
                                    <div className="text-xs text-foreground/50 mt-1 font-medium">
                                        IDs {userRange.start} - {userRange.end}
                                        {repetitionCount > 1 && <span className="text-purple-500"> × {repetitionCount} Reps</span>}
                                    </div>
                                    {repetitionCount > 1 && (
                                        <div className="text-xs font-bold text-blue-500 mt-2 p-1.5 bg-blue-500/10 rounded inline-block">
                                            = {(userRange.end - userRange.start + 1) * repetitionCount} Total Orders
                                        </div>
                                    )}
                                </div>
                                {executionMode === 'full_automation' && (
                                    <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                        <div className="text-xs font-bold text-foreground/40 uppercase mb-2 tracking-wider">Estimated Total</div>
                                        <div className={`text-2xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            ₹{(calculateTotal() * (userRange.end - userRange.start + 1)).toFixed(2)}
                                        </div>
                                        <div className="text-xs text-foreground/50 mt-1 font-medium">Across all users</div>
                                    </div>
                                )}
                            </div>

                            {/* Products Review */}
                            {executionMode === 'full_automation' && (
                                <div>
                                    <h3 className="text-xs font-bold text-foreground/40 mb-4 uppercase tracking-wider">Order Contents</h3>
                                    <div className="space-y-3">
                                        {selectedProducts.map(sp => {
                                            const product = getProductDetails(sp.productId);
                                            if (!product) return null;
                                            return (
                                                <div key={sp.productId} className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'
                                                    }`}>
                                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDark ? 'bg-white/10' : 'bg-white border border-slate-200'
                                                        }`}>
                                                        <ShoppingCart className="w-5 h-5 text-foreground/50" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-bold text-foreground">{product.name}</div>
                                                        <div className="text-xs text-foreground/50 mt-0.5">Qty: {sp.quantity}</div>
                                                    </div>
                                                    <div className="text-right font-mono font-bold text-foreground">
                                                        ₹{(product.price * sp.quantity).toFixed(2)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Delivery & Settings */}
                            <div className="space-y-4">
                                {executionMode === 'full_automation' && (
                                    <div className={`flex items-start gap-4 p-4 rounded-xl border ${isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'
                                        }`}>
                                        <Truck className={`w-5 h-5 mt-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                                        <div>
                                            <div className={`font-bold mb-1 ${isDark ? 'text-purple-200' : 'text-purple-800'}`}>Delivery Address</div>
                                            {(() => {
                                                const address = addresses.find(a => a.id === selectedAddressId);
                                                return address ? (
                                                    <div className="text-sm text-foreground/70 leading-relaxed font-medium">
                                                        {address.full_name}<br />
                                                        {address.flat_number}, {address.street}<br />
                                                        {address.city}, {address.state} - {address.pincode}
                                                    </div>
                                                ) : <div className="text-sm text-red-500">Not selected</div>;
                                            })()}
                                        </div>
                                    </div>
                                )}

                                <div className={`flex items-start gap-4 p-4 rounded-xl border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
                                    }`}>
                                    <Settings className={`w-5 h-5 mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                    <div className="w-full">
                                        <div className={`font-bold mb-2 ${isDark ? 'text-blue-200' : 'text-blue-800'}`}>Configuration</div>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-8 text-sm">
                                            <div className="flex justify-between border-b border-foreground/5 pb-2">
                                                <span className="text-foreground/50">Browsers</span>
                                                <span className="font-bold text-foreground">{concurrent}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-foreground/5 pb-2">
                                                <span className="text-foreground/50">Headless</span>
                                                <span className="font-bold text-foreground">{headless ? 'On' : 'Off'}</span>
                                            </div>
                                            <div className="flex justify-between pt-1">
                                                <span className="text-foreground/50">Max Budget</span>
                                                <span className="font-bold text-foreground">{maxCartValue > 0 ? `₹${maxCartValue}` : 'None'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className={`flex gap-4 p-4 rounded-xl border items-center ${isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                                }`}>
                                <AlertTriangle className="w-6 h-6 text-yellow-500 shrink-0" />
                                <p className={`text-sm font-medium ${isDark ? 'text-yellow-200/80' : 'text-yellow-800/80'}`}>
                                    This action will initiate automated orders. Please ensure you have sufficient wallet balance and valid credentials.
                                </p>
                            </div>
                        </div>

                        <div className={`p-6 border-t sticky bottom-0 flex gap-4 ${isDark ? 'bg-[#1e1e2d] border-white/5' : 'bg-white border-slate-100'
                            }`}>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                disabled={isLoading}
                                className={`flex-1 px-6 py-4 rounded-xl font-bold text-foreground transition-colors border ${isDark
                                    ? 'bg-white/5 hover:bg-white/10 border-white/5'
                                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200'
                                    }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmOrder}
                                disabled={isLoading}
                                className={`flex-[2] px-6 py-4 rounded-xl font-bold text-white transition-all transform flex items-center justify-center gap-2 ${isLoading
                                    ? 'bg-slate-700 cursor-wait'
                                    : 'bg-gradient-to-r from-emerald-600 to-green-600 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0'
                                    }`}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Initializing...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current" />
                                        Launch Automation
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OrderForm;
