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
  ShoppingBag,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';
import { api } from '../services/api';
import { Order, Product } from '../types';
import { CartDrawer } from '../components/CartDrawer';
import { SettingsModal } from '../components/SettingsModal';
import { CheckoutAddressModal } from '../components/CheckoutAddressModal';
import { PaymentModal } from '../components/PaymentModal';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabQuery = searchParams.get('tab');
  const initialTab = (tabQuery === 'completed' || tabQuery === 'past') ? 'completed' : 'pending';

  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  // Checkout modals state for reordering
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Sync tab with URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'completed' || tabParam === 'past') {
      setActiveTab('completed');
    } else if (tabParam === 'pending' || tabParam === 'current') {
      setActiveTab('pending');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'pending' | 'completed') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const toggleOrderAccordion = (orderId: string) => {
    setExpandedOrderIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const res = await api.getOrders();
      const list = res.orders || [];
      setOrders(list);

      // By default, expand the first order in pending tab for immediate visibility
      if (list.length > 0) {
        setExpandedOrderIds((prev) => {
          if (Object.keys(prev).length === 0) {
            return { [list[0].id]: true };
          }
          return prev;
        });
      }
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

  // Reorder items from past order
  const handleReorder = (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    for (const item of order.items) {
      const matchedProd = products.find(
        (p) => String(p.id) === String(item.product_id) ||
               p.name?.toLowerCase().trim() === item.name_snapshot?.toLowerCase().trim()
      );
      const safePrice = Number(item.price_snapshot) || Number(matchedProd?.price) || 149;
      const safeQty = Math.max(1, Number(item.qty) || 1);

      if (matchedProd) {
        addItem(
          {
            ...matchedProd,
            price: safePrice,
            remaining_quantity: matchedProd.remaining_quantity !== undefined && matchedProd.remaining_quantity > 0
              ? matchedProd.remaining_quantity
              : 50,
          },
          safeQty
        );
      } else {
        addItem(
          {
            id: String(item.product_id),
            name: item.name_snapshot || 'Aurra Beverage',
            flavor: 'Botanical Sparkler',
            price: safePrice,
            image_url: getProductImage(item.product_id, item.name_snapshot),
            description: item.name_snapshot || 'Aurra Beverage',
            volume: '330ml',
            calories: 40,
            active: 1,
            total_quantity: 50,
            remaining_quantity: 50,
            created_at: new Date().toISOString(),
          },
          safeQty
        );
      }
    }
    openCart();
  };

  // Pending Orders: Displays orders that are confirmed and not yet fully delivered
  const pendingOrders = orders.filter((o) => {
    const st = (o.status || '').toLowerCase().trim();
    return st === 'confirmed' || st === 'out_for_delivery' || st === 'preparing' || (st !== 'delivered' && st !== 'cancelled');
  });
  const completedOrders = orders.filter(
    (o) => (o.status || '').toLowerCase().trim() === 'delivered'
  );

  const getProductImage = (productId: string, nameSnapshot: string) => {
    const matched = products.find(
      (p) => p.id === productId || p.name?.toLowerCase().trim() === nameSnapshot.toLowerCase().trim()
    );
    return matched?.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg';
  };

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
              <span>Sync Orders</span>
            </button>
          </div>
        </div>

        {/* Page Hero Header */}
        <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-emerald-50/60 p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:from-slate-900 dark:via-slate-900/60 dark:to-slate-950 mb-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-400/30 mb-2.5">
                <Package className="h-3.5 w-3.5 text-amber-600" />
                <span>Aurra Logistics &amp; Customer Orders Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                My Orders
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Track your active shipments in Pending Orders, or review fulfilled shipments in Completed Orders.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="rounded-2xl bg-white/90 p-3 text-center dark:bg-slate-800/90 border border-amber-200/40 dark:border-slate-700 shadow-xs min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {pendingOrders.length}
                </span>
              </div>
              <div className="rounded-2xl bg-white/90 p-3 text-center dark:bg-slate-800/90 border border-amber-200/40 dark:border-slate-700 shadow-xs min-w-[100px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {completedOrders.length}
                </span>
              </div>
            </div>
          </div>

          {/* Amazon-Style Tab Selector */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-amber-200/40 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleTabChange('pending')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Pending Orders ({pendingOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('completed')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white/80 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed Orders ({completedOrders.length})</span>
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
        ) : activeTab === 'pending' ? (
          /* TAB 1: PENDING ORDERS (ONLY status == 'confirmed') */
          pendingOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-950/40 mb-3">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No pending orders</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                You do not have any confirmed orders waiting for delivery right now.
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
            <div className="space-y-4">
              {pendingOrders.map((ord) => {
                const isExpanded = Boolean(expandedOrderIds[ord.id]);
                const dateString = new Date(ord.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                const totalItemCount = ord.items?.reduce((sum, item) => sum + item.qty, 0) || ord.items?.length || 1;

                return (
                  <div
                    key={ord.id}
                    className="rounded-2xl border border-amber-200/90 bg-white shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
                  >
                    {/* Amazon-Style Order Row Header (Clickable Accordion Trigger) */}
                    <div
                      onClick={() => toggleOrderAccordion(ord.id)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-amber-50/40 dark:hover:bg-slate-800/40 transition-colors select-none"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Common Order ID */}
                        <div className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-amber-500" />
                          <span className="font-mono text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            #{ord.id}
                          </span>
                        </div>

                        {/* Order Date */}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {dateString}
                        </span>

                        {/* Status Badge: Confirmed or Out for Delivery */}
                        {ord.status === 'out_for_delivery' ? (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300/60 flex items-center gap-1.5 shadow-xs">
                            <Truck className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
                            <span>Out for Delivery</span>
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/15 px-3 py-0.5 text-[11px] font-black text-amber-700 dark:bg-amber-400/20 dark:text-amber-300 border border-amber-400/30 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
                            <span>Confirmed · Pending Delivery</span>
                          </span>
                        )}
                      </div>

                      {/* Right Side: Total Price & Accordion Toggle */}
                      <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-right">
                          <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                            Total: ₹{ord.total}
                          </div>
                          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} · Paid via UPI
                          </div>
                        </div>

                        {/* Accordion Expand/Collapse Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderAccordion(ord.id);
                          }}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Items' : 'View Breakdown'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-amber-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Accordion Body: Complete breakdown of items inside this specific order */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 p-5 dark:bg-slate-900/60 space-y-4 animate-in fade-in duration-200">
                        
                        {/* Cold-Chain Status Banner */}
                        <div className="rounded-xl bg-white p-3.5 border border-amber-200/60 dark:bg-slate-800/60 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:bg-amber-500/25">
                              <Truck className="h-4 w-4" />
                            </span>
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white">
                                Express Cold-Chain Logistics
                              </span>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Fresh 330ml pressurized cans dispatched under temperature control.
                              </p>
                            </div>
                          </div>
                          {ord.status === 'out_for_delivery' ? (
                            <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200/60 self-start sm:self-auto flex items-center gap-1.5">
                              <Truck className="h-3.5 w-3.5 text-sky-600 animate-pulse" />
                              <span>Out for Delivery · Live in Transit</span>
                            </span>
                          ) : (
                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 self-start sm:self-auto">
                              Arriving in 45–60 mins
                            </span>
                          )}
                        </div>

                        {/* Breakdown of items in this single order */}
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
                            Order Items Breakdown ({ord.items?.length || 0} Flavors)
                          </h4>

                          <div className="space-y-2">
                            {ord.items && ord.items.length > 0 ? (
                              ord.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/80"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700">
                                      <img
                                        src={getProductImage(item.product_id, item.name_snapshot)}
                                        alt={item.name_snapshot}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {item.name_snapshot}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                        ₹{item.price_snapshot} each · 330ml Can
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 shrink-0 text-right">
                                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-black text-amber-700 dark:text-amber-300">
                                      Qty: {item.qty}
                                    </span>
                                    <span className="text-xs font-black text-slate-900 dark:text-white tabular-nums min-w-[60px]">
                                      ₹{item.price_snapshot * item.qty}
                                    </span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl bg-white p-3 text-xs text-slate-500 dark:bg-slate-800">
                                Single item purchase · Total: ₹{ord.total}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order Summary Footer */}
                        <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">
                            Status managed by Aurra Distribution Admin.
                          </span>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-400 block">Total Billed</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                              ₹{ord.total} INR
                            </span>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* TAB 2: COMPLETED ORDERS (ONLY status == 'delivered') */
          completedOrders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40 mb-3">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">No completed orders yet</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Orders marked as delivered by the Aurra delivery team will appear here once fulfilled.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedOrders.map((ord) => {
                const isExpanded = Boolean(expandedOrderIds[ord.id]);
                const dateString = new Date(ord.created_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                const totalItemCount = ord.items?.reduce((sum, item) => sum + item.qty, 0) || ord.items?.length || 1;

                return (
                  <div
                    key={ord.id}
                    className="rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
                  >
                    {/* Amazon-Style Order Row Header (Clickable Accordion Trigger) */}
                    <div
                      onClick={() => toggleOrderAccordion(ord.id)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors select-none"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Common Order ID */}
                        <div className="flex items-center gap-1.5">
                          <Receipt className="h-4 w-4 text-emerald-500" />
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700">
                            #{ord.id}
                          </span>
                        </div>

                        {/* Order Date */}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dateString}
                        </span>

                        {/* Status Badge: Delivered */}
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1 border border-emerald-200/50">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>DELIVERED &amp; COMPLETED</span>
                        </span>
                      </div>

                      {/* Right Side: Total Price, Reorder & Accordion Toggle */}
                      <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                        <div className="text-right">
                          <div className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                            Total: ₹{ord.total}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReorder(ord);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold transition-colors shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reorder</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleOrderAccordion(ord.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={isExpanded ? 'Collapse' : 'Expand breakdown'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Accordion Body: Complete breakdown of items inside this specific order */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 p-5 dark:bg-slate-900/60 space-y-3 animate-in fade-in duration-200">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          Items in this Order ({ord.items?.length || 0})
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {ord.items?.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 rounded-xl bg-white p-3 text-xs dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs"
                            >
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-700">
                                <img
                                  src={getProductImage(item.product_id, item.name_snapshot)}
                                  alt={item.name_snapshot}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.name_snapshot}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Qty: {item.qty} · ₹{item.price_snapshot} each
                                </div>
                              </div>
                              <span className="font-black text-slate-900 dark:text-white tabular-nums shrink-0">
                                ₹{item.price_snapshot * item.qty}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Cart Drawer with full functional checkout trigger */}
      <CartDrawer
        onProceedToCheckout={() => {
          if (!user) {
            window.location.href = '/auth';
            return;
          }
          setIsAddressModalOpen(true);
        }}
      />

      {/* Checkout Address & Mobile Verification Modal */}
      <CheckoutAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onConfirmed={() => {
          setIsAddressModalOpen(false);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* Payment Modal with Pure Integrated Dynamic Razorpay QR */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={(newOrder: Order) => {
          setConfirmedOrder(newOrder);
          fetchOrders();
          setActiveTab('pending');
          setSearchParams({ tab: 'pending' });
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onViewOrders={() => {
          setConfirmedOrder(null);
          setActiveTab('pending');
          setSearchParams({ tab: 'pending' });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
