"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TiraUser, api } from '@/libs/api';
import { useTheme } from '@/libs/theme';
import { Upload, Copy, FileText, CheckCircle2, AlertCircle, X, ChevronLeft, ChevronRight, UserPlus, Trash2, Power, Download } from 'lucide-react';

interface TiraUserManagerProps {
    onRefresh: () => void;
}

const TiraUserManager: React.FC<TiraUserManagerProps> = ({ onRefresh }) => {
    const { mode } = useTheme();
    const isDark = mode === 'dark';
    const [tiraUsers, setTiraUsers] = useState<TiraUser[]>([]);
    const [totalUsers, setTotalUsers] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [limit, setLimit] = useState(50);
    const [isLoading, setIsLoading] = useState(false);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState<{ success: number, errors: number, logs: string[] } | null>(null);
    const [testingUserId, setTestingUserId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<Partial<TiraUser>>({
        name: '',
        email: '',
        phone: '',
        is_active: true,
        extra_data: {}
    });
    const [cookieInput, setCookieInput] = useState('');

    const fetchUsers = async (page: number) => {
        setIsLoading(true);
        try {
            const res = await api.tiraUsers.getAll(page, limit);
            setTiraUsers(res.users || []);
            setTotalUsers(res.total || 0);
            setTotalPages(res.total_pages || 1);
            setCurrentPage(res.page || page);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(currentPage);
    }, [currentPage, limit]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isAdding) {
            // Save current scroll position
            const scrollY = window.scrollY;
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
        } else {
            // Restore body scroll
            const scrollY = document.body.style.top;
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            // Restore scroll position
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
        };
    }, [isAdding]);

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            is_active: true,
            extra_data: {}
        });
        setCookieInput('');
        setIsAdding(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let parsedCookies = [];
            if (cookieInput.trim()) {
                try {
                    let str = cookieInput.trim();
                    if (str.includes('"domain":') && !str.startsWith('[')) {
                        if (!str.startsWith('{')) str = `{${str}}`;
                    }
                    const parsed = JSON.parse(str);
                    parsedCookies = Array.isArray(parsed) ? parsed : [parsed];
                } catch (err) {
                    console.warn("Failed to parse cookies, saving as empty/raw", err);
                    alert("Invalid JSON format for cookies. Please check syntax.");
                    return;
                }
            }

            const payload = { ...formData, cookies: parsedCookies };

            if (editingId !== null) {
                await api.tiraUsers.update(editingId, payload);
            } else {
                await api.tiraUsers.create(payload);
            }
            resetForm();
            fetchUsers(currentPage);
            onRefresh();
        } catch (error) {
            console.error('Failed to save user:', error);
        }
    };

    const handleEdit = (user: TiraUser) => {
        setFormData({
            name: user.name,
            email: user.email,
            phone: user.phone,
            is_active: user.is_active,
            extra_data: user.extra_data
        });
        setCookieInput(user.cookies ? JSON.stringify(user.cookies, null, 2) : '');
        setEditingId(user.id);
        setIsAdding(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            await api.tiraUsers.delete(id);
            fetchUsers(currentPage);
            onRefresh();
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    const handleToggleActive = async (user: TiraUser) => {
        try {
            await api.tiraUsers.update(user.id, {
                is_active: !user.is_active
            });
            fetchUsers(currentPage);
            onRefresh();
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    };

    const handleTestLogin = async (user: TiraUser) => {
        if (testingUserId) return;
        setTestingUserId(user.id);
        try {
            const res = await api.automation.testLogin(user.id);
            if (res.success) {
                alert(`Login Successful for ${user.name}!`);
            } else {
                alert(`Login Failed for ${user.name}: ${res.message}`);
            }
        } catch (error: any) {
            console.error('Test login failed:', error);
            alert(`Test login failed: ${error.message}`);
        } finally {
            setTestingUserId(null);
        }
    };

    const copyCSVFormat = () => {
        const format = "name,email,phone,points,is_active\nJohn Doe,john@example.com,9876543210,150,true";
        navigator.clipboard.writeText(format);
        alert('CSV format template copied to clipboard!');
    };

    const downloadCSV = async () => {
        try {
            setIsLoading(true);
            const res = await api.tiraUsers.exportAll();
            const users = res.users || [];

            if (users.length === 0) {
                alert('No users to export');
                return;
            }

            // CSV Headers
            const headers = ['ID', 'Name', 'Email', 'Phone', 'Points', 'Active', 'Cookies', 'Created At', 'Updated At'];

            // Escape CSV field
            const escapeCSV = (field: any) => {
                if (field === null || field === undefined) return '';
                const str = String(field);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Build CSV rows
            const rows = users.map((user: TiraUser) => [
                user.id,
                escapeCSV(user.name || ''),
                escapeCSV(user.email || ''),
                escapeCSV(user.phone || ''),
                escapeCSV(user.points || ''),
                user.is_active ? 'true' : 'false',
                escapeCSV(JSON.stringify(user.cookies || [])),
                escapeCSV(user.created_at || ''),
                escapeCSV(user.updated_at || '')
            ].join(','));

            const csvContent = [headers.join(','), ...rows].join('\n');

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

            link.setAttribute('href', url);
            link.setAttribute('download', `tira-users-${timestamp}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('Failed to download CSV:', error);
            alert('Failed to download CSV. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim());
                if (lines.length === 0) throw new Error("File is empty");

                let data: any[] = [];
                const parseCSVLine = (str: string) => {
                    const result = [];
                    let start = 0;
                    let quote = false;
                    for (let i = 0; i < str.length; i++) {
                        if (str[i] === '"') {
                            quote = !quote;
                        } else if (str[i] === ',' && !quote) {
                            let val = str.substring(start, i).trim();
                            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
                            result.push(val);
                            start = i + 1;
                        }
                    }
                    let lastVal = str.substring(start).trim();
                    if (lastVal.startsWith('"') && lastVal.endsWith('"')) lastVal = lastVal.slice(1, -1).replace(/""/g, '"');
                    result.push(lastVal);
                    return result;
                };

                const firstLineCols = parseCSVLine(lines[0].toLowerCase());
                const hasHeader = firstLineCols.includes('name') && (firstLineCols.includes('cookies') || firstLineCols.includes('email'));

                if (hasHeader) {
                    const headers = firstLineCols;
                    data = lines.slice(1).map(line => {
                        const values = parseCSVLine(line);
                        const obj: any = {};
                        headers.forEach((header, i) => {
                            let value: any = values[i];
                            if (header === 'is_active') value = value?.toLowerCase() === 'true';
                            if (header === 'cookies') {
                                try {
                                    value = value ? JSON.parse(value) : [];
                                } catch (e) {
                                    console.warn('Failed to parse cookies JSON', e);
                                    value = [];
                                }
                            }
                            obj[header] = value;
                        });
                        return obj;
                    });
                } else {
                    data = lines.map(line => {
                        const cols = parseCSVLine(line);
                        if (cols.length < 2) return null;
                        const name = cols[1]?.trim();
                        if (!name) return null;
                        let cookies = [];
                        try {
                            let cookieStr = cols[2] || "[]";
                            if (cookieStr.startsWith('""') && cookieStr.endsWith('""')) {
                                cookieStr = cookieStr.substring(1, cookieStr.length - 1);
                            }
                            if (cookieStr.includes('"domain":') && !cookieStr.trim().startsWith('[')) {
                                if (!cookieStr.trim().startsWith('{')) cookieStr = `{${cookieStr}}`;
                            }
                            const parsed = JSON.parse(cookieStr);
                            cookies = Array.isArray(parsed) ? parsed : [parsed];
                        } catch (e) {
                            cookies = [];
                        }
                        return { name: name, cookies: cookies, is_active: true };
                    }).filter(Boolean);
                }

                if (data.length === 0) throw new Error("No valid data found");

                const res = await api.tiraUsers.bulkUpdate(data);
                setImportStatus({
                    success: res.success_count,
                    errors: res.error_count,
                    logs: res.errors || []
                });
                fetchUsers(1);
                onRefresh();
            } catch (error: any) {
                console.error('Bulk update failed:', error);
                alert(`Bulk update failed: ${error.message}`);
            } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const inputClasses = `w-full rounded-xl border p-3 text-sm transition-all outline-none placeholder:text-foreground/30 ${isDark
        ? 'bg-[#1e1e2d] border-white/10 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50'
        : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
        }`;

    const labelClasses = "block text-xs font-bold uppercase tracking-wider text-foreground/50 mb-1.5";

    return (
        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl transition-all flex flex-col h-full ${isDark
            ? 'bg-[#1e1e2d]/60 border-white/5 ring-1 ring-white/5'
            : 'bg-white/60 border-black/5 ring-1 ring-black/5'
            }`}>
            <div className={`p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'border-white/5 bg-white/5' : 'border-slate-100 bg-slate-50/50'
                }`}>
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Tira User Manager</h3>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/10 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                {totalUsers} Total
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={copyCSVFormat}
                        className={`flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${isDark
                            ? 'bg-white/5 hover:bg-white/10 text-foreground border border-white/5'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                            }`}
                        title="Copy CSV Format Template"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Template</span>
                    </button>

                    <button
                        onClick={downloadCSV}
                        disabled={isLoading}
                        className={`flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold transition-all shadow-lg active:scale-95 ${isDark
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Download All Users as CSV"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download CSV</span>
                    </button>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className={`flex items-center space-x-2 rounded-xl px-3 py-2 text-xs font-bold text-white transition-all shadow-lg active:scale-95 ${isDark
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isImporting ? 'Importing...' : 'Bulk Import'}</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".csv"
                        className="hidden"
                    />

                    <button
                        onClick={() => {
                            if (isAdding) {
                                resetForm();
                            } else {
                                setIsAdding(true);
                            }
                        }}
                        className={`rounded-xl px-4 py-2 text-sm font-bold text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 ${isAdding
                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                            : (isDark ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20')
                            }`}
                    >
                        {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                        <span className="hidden sm:inline">{isAdding ? 'Cancel' : 'Add User'}</span>
                    </button>
                </div>
            </div>

            {importStatus && (
                <div className={`m-6 p-4 rounded-xl border animate-in slide-in-from-top-2 relative ${importStatus.errors > 0
                    ? (isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200')
                    : (isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200')
                    }`}>
                    <button onClick={() => setImportStatus(null)} className="absolute top-3 right-3 text-foreground/40 hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-start space-x-3">
                        {importStatus.errors > 0 ? <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />}
                        <div>
                            <p className="font-bold text-sm text-foreground">Import Completed</p>
                            <p className="text-xs text-foreground/60 mt-1">
                                Successfully updated/created <span className="font-bold text-emerald-500">{importStatus.success}</span> users.
                                Errors: <span className="font-bold text-red-500">{importStatus.errors}</span>
                            </p>
                            {importStatus.logs.length > 0 && (
                                <div className={`mt-3 max-h-24 overflow-y-auto text-[10px] space-y-1 font-mono p-2 rounded ${isDark ? 'bg-black/20 text-amber-400' : 'bg-white/50 text-amber-600'
                                    }`}>
                                    {importStatus.logs.map((log, i) => <div key={i}>{log}</div>)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit User */}
            {isAdding && typeof document !== 'undefined' && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
                        onClick={resetForm}
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    />

                    {/* Modal Content */}
                    <div
                        className="fixed z-[9999] animate-in slide-in-from-top-4 duration-200"
                        style={{
                            position: 'fixed',
                            top: '5%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            maxHeight: '90vh',
                            width: '90%',
                            maxWidth: '42rem',
                            overflowY: 'auto'
                        }}
                    >
                        <div className={`rounded-2xl border overflow-hidden backdrop-blur-xl shadow-2xl ${isDark
                            ? 'bg-[#1e1e2d] border-white/10'
                            : 'bg-white border-slate-200'
                            }`}>
                            {/* Modal Header */}
                            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/50'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-foreground">
                                            {editingId !== null ? 'Edit User' : 'Add New User'}
                                        </h3>
                                        <p className="text-xs text-foreground/50">
                                            {editingId !== null ? `Updating user #${editingId}` : 'Create a new Tira user account'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={resetForm}
                                    className={`p-2 rounded-lg transition-colors ${isDark
                                        ? 'text-foreground/60 hover:text-foreground hover:bg-white/10'
                                        : 'text-foreground/60 hover:text-foreground hover:bg-slate-100'
                                        }`}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleSubmit} className="p-6">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Full Name / Username (*)</label>
                                            <input
                                                type="text"
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className={inputClasses}
                                                placeholder="Username"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClasses}>Email Address (Optional)</label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className={inputClasses}
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClasses}>Phone Number (Optional)</label>
                                            <input
                                                type="tel"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className={inputClasses}
                                                placeholder="Phone"
                                            />
                                        </div>
                                        <div className="flex items-center pt-6">
                                            <input
                                                type="checkbox"
                                                id="is_active"
                                                checked={formData.is_active}
                                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <label htmlFor="is_active" className="ml-2 text-sm font-medium text-foreground">Active User</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Cookies (JSON)</label>
                                        <textarea
                                            value={cookieInput}
                                            onChange={e => setCookieInput(e.target.value)}
                                            className={`${inputClasses} h-32 font-mono text-xs`}
                                            placeholder='[{"domain": ".tirabeauty.com", ...}]'
                                        />
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className={`rounded-xl px-6 py-2.5 text-sm font-bold transition-all transform active:scale-95 ${isDark
                                            ? 'bg-white/5 text-foreground/60 hover:bg-white/10 hover:text-foreground border border-white/10'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                            }`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={`rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all transform active:scale-95 ${isDark
                                            ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                                            }`}
                                    >
                                        {editingId !== null ? 'Update User' : 'Save User'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>,
                document.body
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-2 px-6 pt-4 pb-4 custom-scrollbar">
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-foreground/40 gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                            <p className="text-sm italic">Loading users...</p>
                        </div>
                    ) : tiraUsers.length === 0 ? (
                        <div className="text-center py-10 text-foreground/50 italic p-8 rounded-xl border border-dashed border-foreground/10">
                            No Tira users found. Add some to get started.
                        </div>
                    ) : (
                        tiraUsers.map(user => (
                            <div
                                key={user.id}
                                className={`group p-4 rounded-xl transition-all border ${isDark
                                    ? 'bg-white/[0.02] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04]'
                                    : 'bg-slate-50 border-slate-200 hover:border-indigo-500/30 hover:bg-slate-100'
                                    } ${!user.is_active ? 'opacity-60 grayscale-[0.5]' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`font-mono text-xs opacity-50 px-1.5 py-0.5 rounded ${isDark ? 'bg-white/10' : 'bg-black/5'
                                                }`}>#{user.id}</span>
                                            <h4 className="font-bold text-foreground truncate">
                                                {user.name}
                                            </h4>
                                            {!user.is_active && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    INACTIVE
                                                </span>
                                            )}
                                            {user.points && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                                                    }`}>
                                                    {user.points} PTS
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                            <p className="text-xs text-foreground/60 flex items-center gap-2 truncate">
                                                <span className="w-12 text-[10px] font-bold uppercase text-foreground/30">Phone</span>
                                                {user.phone || '-'}
                                            </p>
                                            <p className="text-xs text-foreground/60 flex items-center gap-2 truncate">
                                                <span className="w-12 text-[10px] font-bold uppercase text-foreground/30">Email</span>
                                                {user.email || '-'}
                                            </p>
                                            {user.updated_at && (
                                                <p className="text-[10px] text-foreground/30 mt-1 col-span-2 font-mono">
                                                    Updated: {new Date(user.updated_at).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleActive(user)}
                                            className={`p-2 rounded-lg transition-colors ${user.is_active
                                                ? (isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-100')
                                                : (isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-600 hover:bg-emerald-100')
                                                }`}
                                            title={user.is_active ? "Deactivate User" : "Activate User"}
                                        >
                                            <Power className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleTestLogin(user)}
                                            disabled={testingUserId !== null}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${testingUserId === user.id
                                                ? 'bg-purple-500 text-white border-purple-500 animate-pulse'
                                                : (isDark ? 'border-purple-500/30 text-purple-400 hover:bg-purple-500/10' : 'border-purple-200 text-purple-600 hover:bg-purple-50')
                                                }`}
                                        >
                                            {testingUserId === user.id ? 'Testing...' : 'Test Login'}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${isDark
                                                ? 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                                                : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                                }`}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className={`p-2 rounded-lg transition-colors ${isDark
                                                ? 'text-red-400 hover:bg-red-500/10'
                                                : 'text-red-600 hover:bg-red-50'
                                                }`}
                                            title="Delete User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
                <div className={`mt-2 mx-6 mb-6 flex items-center justify-between border-t pt-4 ${isDark ? 'border-white/5' : 'border-slate-200'
                    }`}>
                    <p className="text-xs text-foreground/50">
                        Showing <span className="font-bold text-foreground">{tiraUsers.length}</span> of <span className="font-bold text-foreground">{totalUsers}</span> users
                    </p>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isDark
                                ? 'border-white/10 hover:bg-white/5'
                                : 'border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center space-x-1">
                            {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                const pageNum = i + 1;
                                // Simple logic for showing pages, can be improved for large numbers
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                            ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20')
                                            : (isDark ? 'hover:bg-white/5 text-foreground/70' : 'hover:bg-slate-100 text-slate-600')}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            {totalPages > 5 && <span className="px-1 text-foreground/30 text-xs">...</span>}
                        </div>

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`p-1.5 rounded-lg border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isDark
                                ? 'border-white/10 hover:bg-white/5'
                                : 'border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TiraUserManager;
