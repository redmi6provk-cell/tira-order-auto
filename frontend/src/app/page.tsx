"use client";

import React, { useState, useEffect } from 'react';
import { api, Product, Address, Order, TiraUser } from '@/libs/api';
import { useWebSocket } from '@/hooks/useWebSocket';
import UserRangeSelector from '@/components/UserRangeSelector';
import OrderForm from '@/components/OrderForm';
import ProductManager from '@/components/ProductManager';
import AddressManager from '@/components/AddressManager';
import CardManager from '@/components/CardManager';
import LogViewer from '@/components/LogViewer';
import OrderHistory from '@/components/OrderHistory';
import CheckpointAutomation from '@/components/CheckpointAutomation';
import TiraUserManager from '@/components/TiraUserManager';
import AccountResultsModal from '@/components/AccountResultsModal';
import BatchHistory from '@/components/BatchHistory';
import SystemStats from '@/components/SystemStats';
import { useTheme } from '@/libs/theme';
import { LogOut, Rocket, Layout, Box, MapPin, History, Moon, Sun, ShieldCheck, Gift, User, Users, BarChart2, CreditCard } from 'lucide-react';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [tiraUsers, setTiraUsers] = useState<TiraUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userRange, setUserRange] = useState({ start: 1, end: 10 });
  const [activeTab, setActiveTab] = useState<'automation' | 'users' | 'products' | 'addresses' | 'cards' | 'history' | 'checkpoints'>('automation');
  const [isLoading, setIsLoading] = useState(true);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const { logs, isConnected, clearLogs } = useWebSocket();
  const { mode, toggleTheme } = useTheme();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, addrRes, cardRes, orderRes, userRes] = await Promise.all([
        api.products.getAll(),
        api.addresses.getAll(),
        api.cards.getAll(),
        api.orders.getAll(),
        api.tiraUsers.getAll()
      ]);

      setProducts(Array.isArray(prodRes) ? prodRes : prodRes?.data ?? []);
      setAddresses(Array.isArray(addrRes) ? addrRes : addrRes?.data ?? []);
      setCards(Array.isArray(cardRes) ? cardRes : cardRes?.data ?? []);
      setOrders(Array.isArray(orderRes) ? orderRes : orderRes?.data ?? []);

      const userData = Array.isArray(userRes) ? userRes : userRes?.users ?? [];
      setTiraUsers(userData);

    } catch (error) {
      console.error("Failed to fetch initial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrderStarted = () => {
    fetchData();
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to terminate the session?')) {
      api.auth.logout();
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a16]">
        <div className="text-center animate-pulse">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-6 text-blue-400 font-mono text-xs tracking-widest uppercase">Initializing Secure Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen pb-12 transition-colors duration-300 bg-background">
        {/* Decorative Background Elements */}
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <header className="glass sticky top-0 z-30 mb-8 border-b border-border">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
              <div className="flex items-center space-x-4 group">
                <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2.5 rounded-xl shadow-lg relative overflow-hidden">
                  <Rocket className="w-6 h-6 text-white relative z-10 group-hover:translate-y-[-2px] transition-transform" />
                  <div className="absolute inset-0 bg-white/20 blur-sm"></div>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Tira Automation
                  </h1>
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                    <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-blue-600 dark:text-blue-400">
                      Admin Protocol V1
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <nav className="hidden md:flex items-center space-x-1 glass p-1 rounded-xl border border-border">
                  {(['automation', 'users', 'products', 'addresses', 'cards', 'history', 'checkpoints'] as const).map((tab) => {
                    const isActive = activeTab === tab;

                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`
          px-5 py-2 rounded-lg text-xs font-bold transition-all duration-300
          flex items-center space-x-2
          ${isActive
                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                            : 'text-foreground/60 hover:text-foreground hover:bg-secondary border border-border/40 hover:border-border'
                          }
        `}
                      >
                        {tab === 'automation' && <Layout className="w-4 h-4" />}
                        {tab === 'users' && <Users className="w-4 h-4" />}
                        {tab === 'products' && <Box className="w-4 h-4" />}
                        {tab === 'addresses' && <MapPin className="w-4 h-4" />}
                        {tab === 'cards' && <CreditCard className="w-4 h-4" />}
                        {tab === 'checkpoints' && <Gift className="w-4 h-4" />}

                        <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      </button>
                    );
                  })}
                </nav>

                <div className="flex items-center space-x-3 pl-4 border-l border-border">
                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    title="Toggle Theme"
                    className="p-2 rounded-lg transition-all text-foreground/60 hover:text-foreground hover:bg-secondary border border-border/40 hover:border-border"
                  >
                    {mode === 'light' ? (
                      <Moon className="w-5 h-5" />
                    ) : (
                      <Sun className="w-5 h-5" />
                    )}
                  </button>

                  {/* Profile Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowProfilePopup(!showProfilePopup)}
                      title="Profile"
                      className="p-2 rounded-lg transition-all text-foreground/60 hover:text-foreground hover:bg-secondary border border-border/40 hover:border-border"
                    >
                      <User className="w-5 h-5" />
                    </button>

                    {/* Profile Popup */}
                    {showProfilePopup && (
                      <>
                        {/* Backdrop to close popup */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowProfilePopup(false)}
                        />

                        {/* Popup Menu */}
                        <div className="absolute right-0 mt-2 w-64 glass rounded-xl border border-border shadow-2xl z-50 animate-slide-up overflow-hidden">
                          {/* Header */}
                          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 p-4 border-b border-border">
                            <div className="flex items-center space-x-3">
                              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-foreground">Admin User</h3>
                                <p className="text-xs text-foreground/60">System Administrator</p>
                              </div>
                            </div>
                          </div>

                          {/* Menu Items */}
                          <div className="p-2">
                            <div className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                              <div className="text-xs text-foreground/50 uppercase tracking-wider font-bold mb-1">Role</div>
                              <div className="text-sm text-foreground font-semibold">Administrator</div>
                            </div>

                            <div className="px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                              <div className="text-xs text-foreground/50 uppercase tracking-wider font-bold mb-1">Access Level</div>
                              <div className="flex items-center space-x-2">
                                <ShieldCheck className="w-4 h-4 text-green-500 dark:text-green-400" />
                                <span className="text-sm text-green-600 dark:text-green-400 font-semibold">Full Access</span>
                              </div>
                            </div>

                            <div className="border-t border-border my-2"></div>

                            <button
                              onClick={() => {
                                setShowProfilePopup(false);
                                handleLogout();
                              }}
                              className="w-full px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-all flex items-center space-x-2 group"
                            >
                              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                              <span className="text-sm font-semibold">Logout</span>
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </header>

          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 animate-slide-up">
            {activeTab === 'automation' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: UI Controls */}
                <div className="lg:col-span-6 space-y-8">
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground">Configuration</h2>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowResultsModal(true)}
                          className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-[10px] font-bold uppercase px-3 py-1 rounded border border-blue-500/20 transition-colors"
                        >
                          View Results
                        </button>
                        <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-400/10 px-2 py-1 rounded border border-purple-500/20 dark:border-purple-400/20 tracking-tighter">
                          SECURE MODE ACTIVE
                        </span>
                      </div>
                    </div>
                    <UserRangeSelector
                      startId={userRange.start}
                      endId={userRange.end}
                      onStartChange={(start) => setUserRange(prev => ({ ...prev, start }))}
                      onEndChange={(end) => setUserRange(prev => ({ ...prev, end }))}
                    />
                    <OrderForm
                      products={products}
                      addresses={addresses}
                      userRange={userRange}
                      onOrderStarted={handleOrderStarted}
                    />
                  </section>
                </div>

                {/* Right Column: Active Monitoring */}
                <div className="lg:col-span-6 space-y-8">
                  <section className="space-y-4">
                    <h2 className="text-lg font-bold text-foreground">Live Monitor</h2>
                    <LogViewer
                      logs={logs}
                      isConnected={isConnected}
                      onClear={clearLogs}
                    />

                    <SystemStats />

                    <div className="glass rounded-xl p-6 border border-border relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent"></div>
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-4 relative z-10">System Status</h3>
                      <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="p-4 bg-secondary/20 rounded-xl border border-border hover:border-primary/30 transition-colors">
                          <div className="text-[10px] uppercase font-bold text-foreground/40 mb-1">Total Products</div>
                          <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">{products.length}</div>
                        </div>
                        <div className="p-4 bg-secondary/20 rounded-xl border border-border hover:border-primary/30 transition-colors">
                          <div className="text-[10px] uppercase font-bold text-foreground/40 mb-1">Active Scope</div>
                          <div className="text-2xl font-bold text-purple-500 dark:text-purple-400">{userRange.end - userRange.start + 1} Users</div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="max-w-5xl mx-auto animate-fade-in">
                <TiraUserManager
                  onRefresh={fetchData}
                />
              </div>
            )}

            {activeTab === 'products' && (
              <div className="max-w-5xl mx-auto animate-fade-in">
                <ProductManager
                  products={products}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="max-w-5xl mx-auto animate-fade-in">
                <AddressManager
                  addresses={addresses}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {activeTab === 'cards' && (
              <div className="max-w-5xl mx-auto animate-fade-in">
                <CardManager
                  cards={cards}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="max-w-6xl mx-auto animate-fade-in">
                <BatchHistory
                  onSelectBatch={(batchId) => {
                    setSelectedBatchId(batchId);
                    setShowResultsModal(true);
                  }}
                />
              </div>
            )}

            {activeTab === 'checkpoints' && (
              <div className="max-w-6xl mx-auto animate-fade-in">
                <CheckpointAutomation />
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Modals - Rendered outside main content for proper positioning */}
      <AccountResultsModal
        isOpen={showResultsModal}
        onClose={() => {
          setShowResultsModal(false);
          setSelectedBatchId(null);
        }}
        batchId={selectedBatchId}
      />
    </>
  );
}