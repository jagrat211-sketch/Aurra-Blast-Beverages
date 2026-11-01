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

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-cranberry-sparkle',
    name: 'Aurra Sparkle Cranberry',
    flavor: 'Tart Cranberry & Wild Botanicals',
    price: 149,
    image_url: '/assets/images/bev_cranberry_sparkle_1793439801856.jpg',
    description: 'Hand-picked crisp cranberries blended with mountain spring effervescence and floral botanical notes.',
    volume: '330ml',
    calories: 42,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-mint-mojito',
    name: 'Aurra Mint Mojito',
    flavor: 'Fresh Garden Spearmint & Persian Lime',
    price: 159,
    image_url: '/assets/images/bev_mint_mojito_1793439802738.jpg',
    description: 'Muddled spearmint leaves paired with zesty cold-pressed lime and fine effervescent bubbles.',
    volume: '330ml',
    calories: 38,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-zesty-lime',
    name: 'Aurra Zesty Lime',
    flavor: 'Crisp Citrus & Himalayan Sea Salt',
    price: 139,
    image_url: '/assets/images/bev_zesty_lime_1793439823884.jpg',
    description: 'Cold-pressed key limes with a subtle pinch of mineral salt for maximum crisp refreshment.',
    volume: '330ml',
    calories: 32,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-mango-rush',
    name: 'Aurra Mango Rush',
    flavor: 'Ratnagiri Alphonso & Sunlit Citrus',
    price: 169,
    image_url: '/assets/images/bev_mango_rush_1793439803204.jpg',
    description: 'Pure sun-ripened Alphonso mango puree kissed with sparkling carbonation and subtle cardamom finish.',
    volume: '330ml',
    calories: 54,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-orange-fizz',
    name: 'Aurra Fizz Orange',
    flavor: 'Nagpur Mandarin & Valencia Orange',
    price: 149,
    image_url: '/assets/images/bev_orange_fizz_1793439826689.jpg',
    description: 'Juicy burst of fresh-squeezed sunburst oranges with sparkling micro-bubbles and orange blossom essence.',
    volume: '330ml',
    calories: 48,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-peach-iced-tea',
    name: 'Aurra Peach Iced Tea',
    flavor: 'Darjeeling Black Tea & Ripe Golden Peach',
    price: 159,
    image_url: '/assets/images/bev_peach_iced_tea_1793439826681.jpg',
    description: 'Single-estate Darjeeling black tea slow-brewed with golden orchard peach slices and organic mint.',
    volume: '355ml',
    calories: 40,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-passionfruit-fizz',
    name: 'Aurra Passionfruit',
    flavor: 'Tropical Passionfruit & Wild Citrus',
    price: 169,
    image_url: '/assets/images/bev_passionfruit_fizz_1793441269499.jpg',
    description: 'Lush golden passionfruit pulp gently carbonated with floral citrus blossom notes for a tropical burst.',
    volume: '330ml',
    calories: 44,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
  {
    id: 'prod-berry-blast',
    name: 'Aurra Berry Blast',
    flavor: 'Wild Blackberry, Blueberry & Acai',
    price: 179,
    image_url: '/assets/aistudio/aurra_berry_blast.jpg',
    description: 'A rich anthocyanin-packed blend of deep wild forest berries, dark grape skin, and fizzy spring water.',
    volume: '330ml',
    calories: 46,
    active: 1,
    total_quantity: 50,
    remaining_quantity: 50,
    category: 'Botanical Sparkler',
    created_at: '2026-10-31T00:00:00.000Z',
  },
];

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
    try {
      return await request<{
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
    } catch (apiErr: any) {
      if (apiErr.status === 400) {
        throw apiErr;
      }
      // Resilient fallback: attempt direct insertion into Supabase if serverless backend returned 500
      try {
        const { supabase } = await import('./supabase.js');
        const cleanEmail = payload.email.toLowerCase().trim();
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', cleanEmail).maybeSingle();
        if (existingUser) {
          throw new ApiError('Email already registered. Please sign in.', 400);
        }
        const { error: insertError } = await supabase.from('users').insert({
          name: payload.name.trim(),
          email: cleanEmail,
          password: payload.password,
          role: 'user',
          created_at: new Date().toISOString(),
        });
        if (insertError && (insertError.code === '23505' || insertError.message?.toLowerCase().includes('duplicate'))) {
          throw new ApiError('Email already registered. Please sign in.', 400);
        }
        return {
          success: true,
          message: 'Account created successfully! Please sign in with your email and password.',
          email: cleanEmail,
        };
      } catch (fallbackErr: any) {
        if (fallbackErr instanceof ApiError) throw fallbackErr;
        throw apiErr;
      }
    }
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
    try {
      const res = await request<{ products: Product[] }>('/api/products');
      if (res && Array.isArray(res.products) && res.products.length > 0) {
        return res;
      }
      return { products: FALLBACK_PRODUCTS };
    } catch (err) {
      console.warn('Network product fetch notice (using instant client catalog):', err);
      return { products: FALLBACK_PRODUCTS };
    }
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
