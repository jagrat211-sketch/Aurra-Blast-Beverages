import { create } from 'zustand';
import { CartItem, Product, User } from '../types';
import { api } from '../services/api';

interface CartState {
  userId: string | null;
  items: CartItem[];
  isCartOpen: boolean;
  isSyncing: boolean;
  setUser: (user: User | null) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, qty?: number) => void;
  removeItem: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  flushPendingEvents: () => Promise<void>;
  
  // Derived totals
  getTotalCount: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getShipping: () => number;
  getGrandTotal: () => number;
}

interface PendingEvent {
  productId: string;
  action: 'add' | 'remove' | 'set_qty';
  qty: number;
  timestamp: string;
}

// Helpers for user-isolated localStorage
function getStorageKey(userId: string | null): string {
  return userId ? `cart-${userId}` : 'cart-guest';
}

function getQueueKey(userId: string | null): string {
  return userId ? `pending_events_${userId}` : 'pending_events_guest';
}

function loadPersistedItems(userId: string | null): CartItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load persisted cart:', err);
  }
  return [];
}

function savePersistedItems(userId: string | null, items: CartItem[]) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(items));
  } catch (err) {
    console.warn('Failed to persist cart items:', err);
  }
}

function loadPendingQueue(userId: string | null): PendingEvent[] {
  try {
    const raw = localStorage.getItem(getQueueKey(userId));
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return [];
}

function savePendingQueue(userId: string | null, queue: PendingEvent[]) {
  try {
    localStorage.setItem(getQueueKey(userId), JSON.stringify(queue));
  } catch {
    // ignore
  }
}

// Dispatch event with instant offline fallback
async function dispatchCartEvent(
  userId: string | null,
  productId: string,
  action: 'add' | 'remove' | 'set_qty',
  qty: number
) {
  if (!userId) return; // Cart events are tied to authenticated users
  try {
    await api.sendCartEvent(productId, action, qty);
  } catch (err) {
    console.warn(`[CartEvent] Failed to send ${action} for ${productId}. Enqueueing for retry.`, err);
    const queue = loadPendingQueue(userId);
    queue.push({
      productId,
      action,
      qty,
      timestamp: new Date().toISOString(),
    });
    savePendingQueue(userId, queue);
  }
}

export const useCartStore = create<CartState>((set, get) => ({
  userId: null,
  items: [],
  isCartOpen: false,
  isSyncing: false,

  setUser: (user: User | null) => {
    const newUserId = user ? user.id : null;
    const currentUserId = get().userId;

    if (newUserId === currentUserId) return;

    if (!newUserId) {
      // User logged out: clear memory store (persisted cart stays intact in localStorage)
      set({ userId: null, items: [], isCartOpen: false });
    } else {
      // User logged in: load their user-specific cart from localStorage
      const userItems = loadPersistedItems(newUserId);
      set({ userId: newUserId, items: userItems });
      // Trigger background flush of any queued events for this user
      setTimeout(() => {
        get().flushPendingEvents();
      }, 500);
    }
  },

  openCart: () => set({ isCartOpen: true }),
  closeCart: () => set({ isCartOpen: false }),
  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  addItem: (product: Product, quantityToAdd: number = 1) => {
    const { userId, items } = get();
    const existingIndex = items.findIndex((i) => i.productId === product.id);

    let updated: CartItem[];
    let newQty: number;

    if (existingIndex > -1) {
      updated = [...items];
      newQty = updated[existingIndex].qty + quantityToAdd;
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: newQty,
      };
    } else {
      newQty = quantityToAdd;
      updated = [
        ...items,
        {
          productId: product.id,
          name: product.name,
          flavor: product.flavor,
          price: product.price,
          qty: newQty,
          image_url: product.image_url,
          volume: product.volume,
        },
      ];
    }

    // 1. Optimistic UI update and save to localStorage
    set({ items: updated });
    savePersistedItems(userId, updated);

    // 2. Fire backend cart event with offline retry guarantee
    dispatchCartEvent(userId, product.id, 'add', newQty);
  },

  removeItem: (productId: string) => {
    const { userId, items } = get();
    const updated = items.filter((i) => i.productId !== productId);

    set({ items: updated });
    savePersistedItems(userId, updated);

    dispatchCartEvent(userId, productId, 'remove', 0);
  },

  setQty: (productId: string, qty: number) => {
    const { userId, items } = get();
    if (qty <= 0) {
      get().removeItem(productId);
      return;
    }

    const updated = items.map((i) =>
      i.productId === productId ? { ...i, qty } : i
    );

    set({ items: updated });
    savePersistedItems(userId, updated);

    dispatchCartEvent(userId, productId, 'set_qty', qty);
  },

  clearCart: () => {
    const { userId } = get();
    set({ items: [] });
    savePersistedItems(userId, []);
  },

  flushPendingEvents: async () => {
    const { userId, isSyncing } = get();
    if (!userId || isSyncing) return;

    const queue = loadPendingQueue(userId);
    if (queue.length === 0) return;

    set({ isSyncing: true });
    const remaining: PendingEvent[] = [];

    for (const evt of queue) {
      try {
        await api.sendCartEvent(evt.productId, evt.action, evt.qty);
      } catch (err) {
        // If still failing, keep in queue
        remaining.push(evt);
      }
    }

    savePendingQueue(userId, remaining);
    set({ isSyncing: false });
  },

  getTotalCount: () => {
    return get().items.reduce((sum, item) => sum + item.qty, 0);
  },

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.qty, 0);
  },

  getTax: () => {
    // 5% GST
    return Math.round(get().getSubtotal() * 0.05);
  },

  getShipping: () => {
    const sub = get().getSubtotal();
    if (sub === 0 || sub >= 499) return 0;
    return 49;
  },

  getGrandTotal: () => {
    const sub = get().getSubtotal();
    if (sub === 0) return 0;
    return sub + get().getTax() + get().getShipping();
  },
}));

// Setup listener to flush offline event queue when internet connection restores
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useCartStore.getState().flushPendingEvents();
  });
}
