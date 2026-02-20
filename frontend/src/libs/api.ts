/**
 * API Client for Tira Automation
 * Communicates with the backend via the Next.js API Proxy
 */

export interface Product {
    id: string;
    name: string;
    url: string;
    price: number;
    image_url?: string;
    brand?: string;
    category?: string;
    in_stock: boolean;
}

export interface Address {
    id: string;
    full_name: string;
    flat_number: string;
    street?: string;
    city?: string;
    state?: string;
    pincode: string;
    is_default: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface TiraUser {
    id: number;
    name?: string;
    email?: string;
    phone?: string;
    points?: string;
    is_active: boolean;
    cookies: any[];
    extra_data: any;
    created_at?: string;
    updated_at?: string;
}

export interface ChromeProfile {
    id: string;
    name: string;
    path: string;
    email?: string;
    status: 'active' | 'inactive' | 'in_use' | 'error';
    last_used?: string;
    total_orders: number;
    successful_orders: number;
    failed_orders: number;
}

export interface OrderProduct {
    product_id: string;
    product_name: string;
    product_url: string;
    quantity: number;
    price: number;
}

export interface OrderConfig {
    user_range_start: number;
    user_range_end: number;
    products: OrderProduct[];
    address_id: string;
    payment_method: string;
    card_details?: any;
    max_cart_value?: number;
    name_suffix?: string;
    concurrent_browsers: number;
    repetition_count: number;
    headless: boolean;
    mode: 'full_automation' | 'test_login';
}

export interface Order {
    id: string;
    user_range_start: number;
    user_range_end: number;
    products: OrderProduct[];
    address: Address;
    payment_method: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    subtotal: number;
    discount: number;
    total: number;
    created_at: string;
    tira_order_number?: string;
    error_message?: string;
    batch_id?: string;
    profile_name?: string;
    logs: any[];
    tira_user_id?: number;
    completed_at?: string;
}


export interface CheckpointResult {
    user_id: number;
    username?: string;
    email?: string;
    points?: string;
    account_name?: string;
    status: 'success' | 'failed' | 'logged_out';
    error?: string;
    checked_at: string;
}

export interface CheckpointResponse {
    task_id: string;
    status: string;
    message: string;
}

export interface CheckpointStatus {
    status: 'processing' | 'completed' | 'failed' | 'not_found';
    progress: number;
    total: number;
    total_points: number;
    started_at: string;
    completed_at?: string;
    error?: string;
}

const API_BASE = "/api/proxy";

// Token management
const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('tira_admin_token') : null;
const setToken = (token: string) => localStorage.setItem('tira_admin_token', token);
const removeToken = () => localStorage.removeItem('tira_admin_token');

const apiFetch = async (url: string, options: any = {}) => {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        removeToken();
        window.location.href = '/login';
    }

    return response;
};

export const api = {
    // Auth
    auth: {
        login: async (username: string, password: string) => {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);

            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            setToken(data.access_token);
            return data;
        },
        logout: () => {
            removeToken();
            if (typeof window !== 'undefined') window.location.href = '/login';
        },
        getMe: () => apiFetch(`${API_BASE}/auth/me`).then(r => r.json()),
        isAuthenticated: () => !!getToken(),
    },

    // Products
    products: {
        getAll: () => apiFetch(`${API_BASE}/products/`).then(r => r.json()),
        get: (id: string) => apiFetch(`${API_BASE}/products/${id}`).then(r => r.json()),
        create: (data: any) => apiFetch(`${API_BASE}/products/`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        update: (id: string, data: any) => apiFetch(`${API_BASE}/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        delete: (id: string) => apiFetch(`${API_BASE}/products/${id}`, {
            method: 'DELETE'
        }).then(r => r.json()),
    },

    // Profiles
    profiles: {
        getAll: () => apiFetch(`${API_BASE}/profiles/`).then(r => r.json()),
        get: (id: string) => apiFetch(`${API_BASE}/profiles/${id}`).then(r => r.json()),
        getStats: (id: string) => apiFetch(`${API_BASE}/profiles/${id}/statistics`).then(r => r.json()),
        test: (id: string) => apiFetch(`${API_BASE}/automation/test-profile/${id}`, {
            method: 'POST'
        }).then(r => r.json()),
    },

    // Addresses
    addresses: {
        getAll: () => apiFetch(`${API_BASE}/addresses/`).then(r => r.json()),
        getDefault: () => apiFetch(`${API_BASE}/addresses/default`).then(r => r.json()),
        create: (data: any) => apiFetch(`${API_BASE}/addresses/`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        update: (id: string, data: any) => apiFetch(`${API_BASE}/addresses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        delete: (id: string) => apiFetch(`${API_BASE}/addresses/${id}`, {
            method: 'DELETE'
        }).then(r => r.json()),
    },

    orders: {
        getAll: () => apiFetch(`${API_BASE}/orders/`).then(r => r.json()),
        getStats: () => apiFetch(`${API_BASE}/orders/statistics/all`).then(r => r.json()),
        getLogs: (id: string) => apiFetch(`${API_BASE}/orders/${id}/logs`).then(r => r.json()),
        getBatchStats: (batchId: string) => apiFetch(`${API_BASE}/orders/batch/${batchId}/stats`).then(r => r.json()),
        getBatches: () => apiFetch(`${API_BASE}/orders/batches/history`).then(r => r.json()),
        clearAll: () => apiFetch(`${API_BASE}/orders/`, { method: 'DELETE' }).then(r => r.json()),
        deleteOrder: (id: string) => apiFetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' }).then(r => r.json()),
        deleteBatch: (id: string) => apiFetch(`${API_BASE}/orders/batch/${id}`, { method: 'DELETE' }).then(r => r.json()),
    },

    // Automation
    automation: {
        execute: (config: any) => apiFetch(`${API_BASE}/automation/execute`, {
            method: 'POST',
            body: JSON.stringify({ config })
        }).then(r => r.json()),
        getActive: () => apiFetch(`${API_BASE}/automation/active`).then(r => r.json()),
        stop: () => apiFetch(`${API_BASE}/automation/stop`, {
            method: 'POST'
        }).then(r => r.json()),
        testLogin: (userId: number) => apiFetch(`${API_BASE}/automation/test-login/${userId}`, {
            method: 'POST'
        }).then(r => r.json()),
        executeTestLogin: (config: any) => apiFetch(`${API_BASE}/automation/test-login`, {
            method: 'POST',
            body: JSON.stringify(config)
        }).then(r => r.json()),
    },

    // Checkpoints
    checkpoints: {
        execute: (config: any) => apiFetch(`${API_BASE}/checkpoints/execute`, {
            method: 'POST',
            body: JSON.stringify({ config })
        }).then(r => r.json()),
        getStatus: (taskId: string) => apiFetch(`${API_BASE}/checkpoints/status/${taskId}`).then(r => r.json()),
        getResults: (taskId: string) => apiFetch(`${API_BASE}/checkpoints/results/${taskId}`).then(r => r.json()),
    },

    // Cards
    cards: {
        getAll: () => apiFetch(`${API_BASE}/cards`).then(r => r.json()),
        get: (id: string) => apiFetch(`${API_BASE}/cards/${id}`).then(r => r.json()),
        getDefault: () => apiFetch(`${API_BASE}/cards/default`).then(r => r.json()),
        create: (data: any) => apiFetch(`${API_BASE}/cards`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        update: (id: string, data: any) => apiFetch(`${API_BASE}/cards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        delete: (id: string) => apiFetch(`${API_BASE}/cards/${id}`, {
            method: 'DELETE'
        }).then(r => r.json()),
    },

    // Tira Users
    tiraUsers: {
        getAll: (page: number = 1, limit: number = 50) =>
            apiFetch(`${API_BASE}/tira_users?page=${page}&limit=${limit}`).then(r => r.json()),
        get: (id: number) => apiFetch(`${API_BASE}/tira_users/${id}`).then(r => r.json()),
        create: (data: any) => apiFetch(`${API_BASE}/tira_users`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        update: (id: number, data: any) => apiFetch(`${API_BASE}/tira_users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        delete: (id: number) => apiFetch(`${API_BASE}/tira_users/${id}`, {
            method: 'DELETE'
        }).then(r => r.json()),
        bulkUpdate: (data: any[]) => apiFetch(`${API_BASE}/tira_users/bulk`, {
            method: 'POST',
            body: JSON.stringify(data)
        }).then(r => r.json()),
        exportAll: () => apiFetch(`${API_BASE}/tira_users/export/all`).then(r => r.json()),
    }
};
