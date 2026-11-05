export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  email_verified: number;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  user_profile?: string;
  delivery_address?: string;
  contact_no?: string;
  parent_id?: string;
}

export interface Product {
  id: string;
  name: string;
  beverage_name?: string;
  flavor: string;
  flavor_notes?: string;
  price: number;
  image_url: string;
  description: string;
  volume: string;
  calories: number;
  category?: string;
  total_quantity?: number;
  remaining_quantity?: number;
  active: number;
  created_at: string;
  updated_at?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  flavor: string;
  price: number;
  qty: number;
  image_url: string;
  volume?: string;
  remaining_quantity?: number;
}

export interface OrderItem {
  id: string;
  product_id: string;
  name_snapshot: string;
  price_snapshot: number;
  qty: number;
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpayPaymentId?: string;
}

export interface CartEventRecord {
  id: string;
  action: 'add' | 'remove' | 'set_qty';
  qty: number;
  created_at: string;
  user_id: string;
  user_name: string;
  user_email: string;
  product_id: string;
  product_name: string;
  product_price: number;
}
