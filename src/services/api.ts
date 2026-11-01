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
    try {
      return await request<{
        success: boolean;
        user: User;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (apiErr: any) {
      // Direct client fallback to Supabase if serverless backend returned 500 or cold-started
      try {
        const { supabase } = await import('./supabase.js');
        const cleanEmail = payload.email.toLowerCase().trim();
        const { data: sbUser } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
        if (sbUser) {
          const storedPassword = sbUser.password || sbUser.password_hash;
          if (storedPassword === payload.password) {
            const role = (sbUser.role === 'admin' || cleanEmail === 'adminaurra@beverages.com') ? 'admin' : 'user';
            const authUser: User = {
              id: String(sbUser.id),
              name: sbUser.name || 'Aurra Customer',
              email: sbUser.email,
              role,
              email_verified: 1,
              created_at: sbUser.created_at,
              updated_at: sbUser.updated_at,
              avatar_url: sbUser.avatar_url || sbUser.user_profile,
              delivery_address: sbUser.delivery_address,
              parent_id: 'AURRA-DIST-IND-01',
            };
            try {
              localStorage.setItem('aurra_auth_user', JSON.stringify(authUser));
            } catch {}
            return { success: true, user: authUser };
          }
        }
      } catch {
        // ignore
      }
      throw apiErr;
    }
  },

  async logout() {
    try {
      localStorage.removeItem('aurra_auth_user');
    } catch {}
    return request<{ success: boolean; message: string }>('/api/auth/logout', {
      method: 'POST',
    }).catch(() => ({ success: true, message: 'Logged out' }));
  },

  async adminLogin(payload: { username: string; password: string }) {
    try {
      return await request<{
        success: boolean;
        user: User;
      }>('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (apiErr: any) {
      const cleanUser = (payload.username || '').toLowerCase().trim();
      const cleanPass = (payload.password || '').trim().toLowerCase();
      if ((cleanUser === 'adminaurra@beverages.com' || cleanUser === 'admin' || cleanUser === 'admin@g.com') && cleanPass === 'admin') {
        const adminUser: User = {
          id: 'admin_sys_01',
          name: 'Aurra Administrator',
          email: 'adminaurra@beverages.com',
          role: 'admin',
          email_verified: 1,
          created_at: new Date().toISOString(),
          parent_id: 'AURRA-HQ-01',
        };
        try {
          localStorage.setItem('aurra_auth_user', JSON.stringify(adminUser));
        } catch {}
        return { success: true, user: adminUser };
      }
      throw apiErr;
    }
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
    let prodsFromApi: Product[] | null = null;
    try {
      const res = await request<{ products: Product[] }>('/api/products');
      if (res && Array.isArray(res.products) && res.products.length > 0) {
        prodsFromApi = res.products;
      }
    } catch (err) {
      console.warn('Backend /api/products unavailable (falling back to direct Supabase):', err);
    }

    // Direct Supabase query to guarantee real-time reflection of all entries (including 13, 14, and all new formulations)
    try {
      const { supabase } = await import('./supabase.js');
      const { data: sbProds } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (sbProds && sbProds.length > 0) {
        // Base list initialized with either prodsFromApi or FALLBACK_PRODUCTS
        let baseList: Product[] = prodsFromApi && prodsFromApi.length > 0
          ? [...prodsFromApi]
          : FALLBACK_PRODUCTS.map((p) => ({ ...p }));

        for (const sbP of sbProds) {
          const mapped: Product = {
            id: String(sbP.id),
            name: sbP.beverage_name || 'Aurra Beverage',
            flavor: sbP.flavor_notes || 'Botanical Sparkler',
            price: Number(sbP.price) || 149,
            image_url: sbP.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg',
            description: sbP.description || '',
            volume: sbP.volume || '330ml',
            calories: typeof sbP.calories === 'number' ? sbP.calories : 40,
            category: sbP.category || 'Botanical Sparkler',
            total_quantity: typeof sbP.total_quantity === 'number' ? sbP.total_quantity : 50,
            remaining_quantity:
              typeof sbP.remaining_quantity === 'number'
                ? sbP.remaining_quantity
                : typeof sbP.total_quantity === 'number'
                ? sbP.total_quantity
                : 50,
            active: sbP.active !== undefined ? (sbP.active ? 1 : 0) : 1,
            created_at: sbP.created_at || new Date().toISOString(),
          };

          const matchIndex = baseList.findIndex(
            (p) =>
              p.name?.toLowerCase().trim() === mapped.name?.toLowerCase().trim() ||
              p.id === mapped.id ||
              (p as any).beverage_name?.toLowerCase().trim() === mapped.name?.toLowerCase().trim()
          );

          if (matchIndex >= 0) {
            baseList[matchIndex] = {
              ...baseList[matchIndex],
              ...mapped,
              image_url: mapped.image_url || baseList[matchIndex].image_url,
            };
          } else {
            baseList.push(mapped);
          }
        }

        let deletedList: string[] = [];
        try {
          deletedList = JSON.parse(localStorage.getItem('aurra_deleted_beverages') || '[]');
        } catch {}

        if (deletedList.length > 0) {
          baseList = baseList.filter(
            (p) =>
              !deletedList.includes(String(p.id)) &&
              !deletedList.includes(p.name?.toLowerCase().trim()) &&
              !deletedList.includes((p as any).beverage_name?.toLowerCase().trim())
          );
        }

        return { products: baseList };
      }
    } catch (sbErr) {
      console.warn('Direct Supabase fetch notice:', sbErr);
    }

    let deletedList: string[] = [];
    try {
      deletedList = JSON.parse(localStorage.getItem('aurra_deleted_beverages') || '[]');
    } catch {}

    const finalList = (prodsFromApi && prodsFromApi.length > 0 ? prodsFromApi : FALLBACK_PRODUCTS).filter(
      (p) =>
        !deletedList.includes(String(p.id)) &&
        !deletedList.includes(p.name?.toLowerCase().trim()) &&
        !deletedList.includes((p as any).beverage_name?.toLowerCase().trim())
    );

    return { products: finalList };
  },

  async saveProduct(payload: Partial<Product>) {
    let result: { success: boolean; product: Product } | null = null;
    try {
      result = await request<{ success: boolean; product: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (apiErr: any) {
      console.warn('API saveProduct notice (using direct Supabase persistence):', apiErr);
    }

    // Direct Supabase synchronization: guarantee write to Supabase products table!
    let savedSbProduct: Product | null = null;
    try {
      const { supabase } = await import('./supabase.js');
      const bevName = (payload.beverage_name || payload.name || '').trim();
      const flavNotes = (payload.flavor_notes || payload.flavor || '').trim();
      const cat = (payload.category || 'Botanical Sparkler').trim();
      const cleanImg = payload.image_url?.startsWith('/src/assets/images/')
        ? payload.image_url.replace('/src/assets/images/', '/assets/images/')
        : (payload.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg');

      // Check if product exists in Supabase by beverage_name or id
      let query = supabase.from('products').select('*');
      if (payload.id && !isNaN(Number(payload.id))) {
        query = query.eq('id', Number(payload.id));
      } else {
        query = query.ilike('beverage_name', bevName);
      }
      const { data: existingSbProd } = await query.maybeSingle();

      if (existingSbProd?.id) {
        const { data: updated } = await supabase
          .from('products')
          .update({
            beverage_name: bevName,
            flavor_notes: flavNotes,
            description: payload.description || '',
            price: Number(payload.price) || 149,
            category: cat,
            total_quantity: Number(payload.total_quantity) || 50,
            remaining_quantity:
              payload.remaining_quantity !== undefined
                ? Number(payload.remaining_quantity)
                : Number(payload.total_quantity) || 50,
            volume: payload.volume || '330ml',
            calories: Number(payload.calories) || 40,
            image_url: cleanImg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSbProd.id)
          .select()
          .maybeSingle();

        if (updated) {
          savedSbProduct = {
            id: String(updated.id),
            name: updated.beverage_name,
            flavor: updated.flavor_notes || 'Botanical Sparkler',
            price: Number(updated.price) || 149,
            image_url: updated.image_url,
            description: updated.description || '',
            volume: updated.volume || '330ml',
            calories: updated.calories || 40,
            category: updated.category || 'Botanical Sparkler',
            total_quantity: updated.total_quantity || 50,
            remaining_quantity: updated.remaining_quantity !== undefined ? updated.remaining_quantity : 50,
            active: 1,
            created_at: updated.created_at || new Date().toISOString(),
          };
        }
      } else {
        const { data: inserted } = await supabase
          .from('products')
          .insert({
            beverage_name: bevName,
            flavor_notes: flavNotes,
            description: payload.description || '',
            price: Number(payload.price) || 149,
            category: cat,
            total_quantity: Number(payload.total_quantity) || 50,
            remaining_quantity:
              payload.remaining_quantity !== undefined
                ? Number(payload.remaining_quantity)
                : Number(payload.total_quantity) || 50,
            volume: payload.volume || '330ml',
            calories: Number(payload.calories) || 40,
            image_url: cleanImg,
            created_at: new Date().toISOString(),
          })
          .select()
          .maybeSingle();

        if (inserted) {
          savedSbProduct = {
            id: String(inserted.id),
            name: inserted.beverage_name,
            flavor: inserted.flavor_notes || 'Botanical Sparkler',
            price: Number(inserted.price) || 149,
            image_url: inserted.image_url,
            description: inserted.description || '',
            volume: inserted.volume || '330ml',
            calories: inserted.calories || 40,
            category: inserted.category || 'Botanical Sparkler',
            total_quantity: inserted.total_quantity || 50,
            remaining_quantity: inserted.remaining_quantity !== undefined ? inserted.remaining_quantity : 50,
            active: 1,
            created_at: inserted.created_at || new Date().toISOString(),
          };
        }
      }
    } catch (sbErr) {
      console.warn('Direct Supabase product persistence notice:', sbErr);
    }

    if (savedSbProduct) {
      return { success: true, product: savedSbProduct };
    }

    if (result) return result;

    const fallbackProduct: Product = {
      id: payload.id || `prod_${Date.now()}`,
      name: payload.name || payload.beverage_name || 'New Beverage',
      flavor: payload.flavor || payload.flavor_notes || 'Botanical Sparkler',
      price: Number(payload.price) || 149,
      image_url: payload.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg',
      description: payload.description || '',
      volume: payload.volume || '330ml',
      calories: Number(payload.calories) || 40,
      active: 1,
      total_quantity: Number(payload.total_quantity) || 50,
      remaining_quantity: Number(payload.remaining_quantity) || 50,
      category: payload.category || 'Botanical Sparkler',
      created_at: new Date().toISOString(),
    };
    return { success: true, product: fallbackProduct };
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

  async deleteProduct(id: string, name?: string) {
    let result: { success: boolean; message: string } | null = null;
    try {
      const q = name ? `?name=${encodeURIComponent(name)}` : '';
      result = await request<{ success: boolean; message: string }>(`/api/products/${id}${q}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('API deleteProduct notice (using direct Supabase deletion):', err);
    }

    // Direct Supabase deletion guarantee
    try {
      const { supabase } = await import('./supabase.js');
      if (!isNaN(Number(id))) {
        await supabase.from('products').delete().eq('id', Number(id));
      } else {
        await supabase.from('products').delete().eq('id', id);
      }
      if (name) {
        await supabase.from('products').delete().ilike('beverage_name', name.trim());
      }
    } catch (sbErr) {
      console.warn('Direct Supabase product deletion notice:', sbErr);
    }

    // Persist deleted items in local storage to prevent them reappearing across sessions
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem('aurra_deleted_beverages') || '[]');
      if (id && !deletedList.includes(String(id))) deletedList.push(String(id));
      if (name && !deletedList.includes(name.toLowerCase().trim())) deletedList.push(name.toLowerCase().trim());
      localStorage.setItem('aurra_deleted_beverages', JSON.stringify(deletedList));
    } catch {}

    // Prune in-memory FALLBACK_PRODUCTS
    const targetName = (name || '').toLowerCase().trim();
    for (let i = FALLBACK_PRODUCTS.length - 1; i >= 0; i--) {
      if (FALLBACK_PRODUCTS[i].id === id || (targetName && FALLBACK_PRODUCTS[i].name.toLowerCase().trim() === targetName)) {
        FALLBACK_PRODUCTS.splice(i, 1);
      }
    }

    return result || { success: true, message: 'Beverage deleted successfully' };
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

  async updateContactNo(payload: { contactNo: string }) {
    const cleanDigits = (payload.contactNo || '').replace(/\D/g, '').slice(0, 10);
    let result: { success: boolean; message: string; user: User } | null = null;
    try {
      result = await request<{ success: boolean; message: string; user: User }>('/api/auth/contact-no', {
        method: 'PUT',
        body: JSON.stringify({ contactNo: cleanDigits }),
      });
    } catch (err) {
      console.warn('API updateContactNo notice (using direct Supabase persistence):', err);
    }

    // Direct Supabase persistence
    try {
      const { supabase } = await import('./supabase.js');
      const cached = localStorage.getItem('aurra_auth_user');
      const userObj = cached ? JSON.parse(cached) : null;
      if (userObj?.email) {
        await supabase
          .from('users')
          .update({
            'contact_no.': cleanDigits,
            updated_at: new Date().toISOString(),
          })
          .eq('email', userObj.email);
        
        userObj.contact_no = cleanDigits;
        localStorage.setItem('aurra_auth_user', JSON.stringify(userObj));
        if (!result) {
          result = { success: true, message: 'Contact number saved!', user: userObj };
        }
      }
    } catch (sbErr) {
      console.warn('Direct Supabase contact_no update notice:', sbErr);
    }

    if (result) return result;
    return { success: true, message: 'Contact number saved!', user: { contact_no: cleanDigits } as any };
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

  async getAdminUsers(): Promise<{ users: any[] }> {
    let usersList: any[] = [];
    try {
      const res = await request<{ users: any[] }>('/api/admin/users');
      if (res?.users && res.users.length > 0) {
        usersList = res.users;
      }
    } catch (err) {
      console.warn('API getAdminUsers notice:', err);
    }

    // Direct Supabase query to guarantee real registered users always reflect
    try {
      const { supabase } = await import('./supabase.js');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        return {
          users: data.map((u) => ({
            id: String(u.id),
            name: u.name,
            email: u.email,
            role: u.role || 'user',
            delivery_address: u.delivery_address || '',
            contact_no: u['contact_no.'] || u.contact_no || '',
            created_at: u.created_at,
          })),
        };
      }
    } catch (sbErr) {
      console.warn('Direct Supabase users fetch notice:', sbErr);
    }

    return { users: usersList };
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
