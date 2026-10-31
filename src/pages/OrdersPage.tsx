import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Truck,
  RotateCcw,
  RefreshCw,
  ArrowLeft,
  Check,
  ShoppingBag,
  ExternalLink,
  User as UserIcon,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';
import { api } from '../services/api';
import { Order, Product } from '../types';
import { CartDrawer } from '../components/CartDrawer';
import { SettingsModal } from '../components/SettingsModal';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'past' ? 'past' : 'current';

  const [activeTab, setActiveTab] = useState<'current' | 'past'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'past' || tabParam === 'current') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'current' | 'past') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await api.getOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.getProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Update order status (simulate tracking or mark delivered)
  const handleUpdateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await api.updateOrderStatus(orderId, status);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Reorder items from past order
  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    for (const item of order.items) {
      const matchedProd = products.find((p) => p.id === item.product_id);
      if (matchedProd) {
        addItem(matchedProd, item.qty);
      } else {
        addItem(
          {
            id: item.product_id,
            name: item.name_snapshot,
            flavor: 'Botanical Sparkler',
            price: item.price_snapshot,
            image_url: '/src/assets/images/hero_beverage_can_1793439801479.jpg',
            description: item.name_snapshot,
            volume: '330ml',
            calories: 40,
            active: 1,
            created_at: new Date().toISOString(),
          },
          item.qty
        );
      }
    }
    openCart();
  };

  // Split into Current vs Past orders
  const currentOrders = orders.filter(
    (o) => o.status !== 'delivered' && o.status !== 'cancelled'
  );
  const pastOrders = orders.filter(
    (o) => o.status === 'delivered' || o.status === 'cancelled'
  );

  return (
    <div className="min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Drinks Menu</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>

            <button
              type="button"
              onClick={fetchOrders}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingOrders ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
          </div>
        </div>

        {/* Page Hero Header */}
        <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-emerald-50/60 p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950 mb-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-400/30 mb-2.5">
                <Package className="h-3.5 w-3.5 text-amber-600" />
                <span>Aurra Logistics &amp; Orders Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                My Orders
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Track your active cold-chain shipments under Current Orders, or review past invoices and reorder your favorite flavors anytime.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="rounded-2xl bg-white/90 p-3 text-center dark:bg-slate-800/90 border border-amber-200/40 dark:border-slate-700 shadow-xs min-w-[90px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {currentOrders.length}
                </span>
              </div>
              <div className="rounded-2xl bg-white/90 p-3 text-center dark:bg-slate-800/90 border border-amber-200/40 dark:border-slate-700 shadow-xs min-w-[90px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Past</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
                  {pastOrders.length}
                </span>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="mt-6 flex gap-2 border-t border-amber-200/40 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('current')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Current Orders ({currentOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('past')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'past'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Past Orders ({pastOrders.length})</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        {!user ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
            <Package className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Sign In Required</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Please sign in to your Aurra account to view your active shipments and past order history.
            </p>
            <Link
              to="/auth"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-xs"
            >
              Sign In Now
            </Link>
          </div>
        ) : loadingOrders ? (
          <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="h-7 w-7 animate-spin text-amber-500" />
            <span>Fetching order records...</span>
          </div>
        ) : activeTab === 'current' ? (
          /* TAB 1: CURRENT ORDERS */
          currentOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 mb-3">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No active current orders</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                You do not have any orders in transit right now. Choose any of our 7 signature fruit energy sparklers to place a new order.
              </p>
              <Link
                to="/"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-xs"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Explore Drinks Menu</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {currentOrders.map((ord) => {
                const dateString = new Date(ord.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                const isProcessing = ord.status === 'confirmed' || ord.status === 'processing';
                const isOutForDelivery = ord.status === 'out_for_delivery';

                return (
                  <div
                    key={ord.id}
                    className="rounded-3xl border border-amber-200/80 bg-white p-6 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900"
                  >
                    {/* Order Meta Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          #{ord.id}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {dateString}
                        </span>
                        <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-black text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {ord.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                        Total: ₹{ord.total} <span className="text-xs font-semibold text-emerald-600">Paid via UPI</span>
                      </div>
                    </div>

                    {/* Progress Tracker Bar */}
                    <div className="my-5 rounded-2xl bg-slate-50/80 p-4 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-amber-500" />
                          <span>Express Cold-Chain Logistics</span>
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">Arriving in 45–60 mins</span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] sm:text-xs">
                        <div className="flex flex-col items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white font-black text-[10px]">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                          <span>Confirmed</span>
                        </div>

                        <div className={`flex flex-col items-center gap-1 font-bold ${
                          isProcessing || isOutForDelivery ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white font-black text-[10px] ${
                            isProcessing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                          }`}>
                            2
                          </div>
                          <span>Chilling &amp; Packing</span>
                        </div>

                        <div className={`flex flex-col items-center gap-1 font-bold ${
                          isOutForDelivery ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}>
                          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-white font-black text-[10px] ${
                            isOutForDelivery ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                          }`}>
                            3
                          </div>
                          <span>Out for Delivery</span>
                        </div>

                        <div className="flex flex-col items-center gap-1 text-slate-400 font-bold">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 text-white font-black text-[10px]">
                            4
                          </div>
                          <span>Delivered</span>
                        </div>
                      </div>
                    </div>

                    {/* Order Items Snapshot */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {ord.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-black shrink-0">
                              {item.qty}x
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.name_snapshot}
                            </span>
                          </div>
                          <span className="font-extrabold text-slate-900 dark:text-white tabular-nums shrink-0">
                            ₹{item.price_snapshot * item.qty}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-400">
                        Cold-chain verified: 330ml pressurized cans delivered fresh.
                      </p>

                      <div className="flex items-center gap-2">
                        {ord.status !== 'out_for_delivery' && (
                          <button
                            type="button"
                            disabled={updatingId === ord.id}
                            onClick={() => handleUpdateStatus(ord.id, 'out_for_delivery')}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            {updatingId === ord.id ? 'Updating...' : 'Advance: Out for Delivery'}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={updatingId === ord.id}
                          onClick={() => handleUpdateStatus(ord.id, 'delivered')}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{updatingId === ord.id ? 'Processing...' : 'Mark as Delivered'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* TAB 2: PAST ORDERS */
          pastOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 mb-3">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No fulfilled past orders</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Completed and delivered orders will be saved here for one-click reordering and billing records.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastOrders.map((ord) => {
                const dateString = new Date(ord.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });

                return (
                  <div
                    key={ord.id}
                    className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          #{ord.id}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dateString}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/50">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>DELIVERED &amp; COMPLETED</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                          Total: ₹{ord.total}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReorder(ord)}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reorder All</span>
                        </button>
                      </div>
                    </div>

                    {/* Order items snapshot */}
                    <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                      {ord.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                        >
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                            {item.qty}x {item.name_snapshot}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white tabular-nums shrink-0">
                            ₹{item.price_snapshot * item.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => {}} />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
