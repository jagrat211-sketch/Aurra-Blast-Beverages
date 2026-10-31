export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  email_verified: number;
  created_at?: string;
  avatar_url?: string;
  parent_id?: string;
}

export interface Product {
  id: string;
  name: string;
  flavor: string;
  price: number;
  image_url: string;
  description: string;
  volume: string;
  calories: number;
  active: number;
  created_at: string;
}

export interface CartItem {
  productId: string;
  name: string;
  flavor: string;
  price: number;
  qty: number;
  image_url: string;
  volume?: string;
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
