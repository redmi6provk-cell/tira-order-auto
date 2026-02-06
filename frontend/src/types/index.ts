import { Product, Address, ChromeProfile, Order, OrderProduct } from '@/libs/api';

export type {
    Product,
    Address,
    ChromeProfile,
    Order,
    OrderProduct
};

export interface OrderConfig {
    products: OrderProduct[];
    address_id: string;
    coupon_code?: string;
    profile_ids: string[];
    concurrent_browsers: number;
    headless: boolean;
    payment_method: 'cash_on_delivery' | 'card';
}

export interface OrderResponse {
    order_id: string;
    status: string;
    message: string;
    details?: any;
}
