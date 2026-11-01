import { User, Product, Order, CartEventRecord } from '../types';

export class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly cookie
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  async getMe(): Promise<{ user: User | null }> {
    try {
      return await request<{ user: User }>('/api/auth/me');
    } catch (err: any) {
      if (err.status === 401) {
        return { user: null };
      }
      throw err;
    }
  },

  async signup(payload: { name: string; email: string; password: string }) {
    return request<{
      success?: boolean;
      user?: User;
      requiresVerification?: boolean;
      email?: string;
      message: string;
      devVerificationCode?: string;
    }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async verifyEmail(payload: { email: string; code: string }) {
    return request<{
      success: boolean;
      message: string;
      user: User;
    }>('/api/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resendCode(email: string) {
    return request<{
      success: boolean;
      message: string;
      devVerificationCode?: string;
    }>('/api/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async login(payload: { email: string; password: string }) {
    return request<{
      success: boolean;
      user: User;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logout() {
    return request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },

  async adminLogin(payload: { username: string; password: string }) {
    return request<{
      success: boolean;
      user: User;
    }>('/api/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<{
      success: boolean;
      message: string;
    }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateAvatar(payload: { avatarUrl: string }) {
    return request<{
      success: boolean;
      user: User;
    }>('/api/auth/avatar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Products
  async getProducts(): Promise<{ products: Product[] }> {
    return request<{ products: Product[] }>('/api/products');
  },

  async saveProduct(payload: Partial<Product>) {
    return request<{ success: boolean; product: Product }>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadBeverageImage(payload: {
    imageBase64: string;
    filename?: string;
    productId?: string;
    cloudinaryConfig?: { cloudName?: string; uploadPreset?: string };
  }) {
    return request<{
      success: boolean;
      url: string;
      filename: string;
      sizeBytes: number;
      provider: 'local_storage' | 'cloudinary';
      product?: Product;
    }>('/api/products/upload-image', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProductImage(productId: string, imageUrl: string) {
    return request<{ success: boolean; product: Product }>(`/api/products/${productId}/image`, {
      method: 'PUT',
      body: JSON.stringify({ imageUrl }),
    });
  },

  async getStorageInfo() {
    return request<{
      activeProvider: string;
      hasCloudinaryEnv: boolean;
      localFileCount: number;
      cloudRecommendations: Array<{
        provider: string;
        isRecommended: boolean;
        freeLimit: string;
        expiration: string;
        easeOfIntegration: string;
        bestFor: string;
      }>;
    }>('/api/storage/info');
  },

  // Cart events
  async sendCartEvent(productId: string, action: 'add' | 'remove' | 'set_qty', qty: number) {
    return request<{ success: boolean; eventId: string; timestamp: string }>('/api/cart/events', {
      method: 'POST',
      body: JSON.stringify({ productId, action, qty }),
    });
  },

  async updateProfile(payload: { name?: string; delivery_address?: string }) {
    return request<{ success: boolean; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async updateAddress(payload: { address: string }) {
    return request<{ success: boolean; message: string; user: User }>('/api/auth/address', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Orders
  async createOrder(items: { productId: string; qty: number }[]) {
    return request<{
      success: boolean;
      order: Order;
    }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  async getOrders(): Promise<{ orders: Order[] }> {
    return request<{ orders: Order[] }>('/api/orders');
  },

  async updateOrderStatus(orderId: string, status: string) {
    return request<{ success: boolean; status: string }>(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Admin
  async getAdminOverview() {
    return request<{
      stats: {
        totalUsers: number;
        totalOrders: number;
        totalRevenue: number;
        totalCartEvents: number;
      };
    }>('/api/admin/overview');
  },

  async getAdminUsers() {
    return request<{ users: any[] }>('/api/admin/users');
  },

  async getAdminCartEvents(limit = 100) {
    return request<{ events: CartEventRecord[] }>(`/api/admin/cart-events?limit=${limit}`);
  },

  async runAdminSqlQuery(query: string) {
    return request<{ rows: any[]; rowCount: number }>('/api/admin/sql-query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  // Feature Flags
  async getFeatureFlags() {
    return request<{ aura_tribute_enabled: boolean }>('/api/feature-flags');
  },

  async updateFeatureFlag(key: string, enabled: boolean) {
    return request<{ success: boolean; flags: { aura_tribute_enabled: boolean }; message: string }>('/api/admin/feature-flags', {
      method: 'PUT',
      body: JSON.stringify({ key, enabled }),
    });
  },
};
