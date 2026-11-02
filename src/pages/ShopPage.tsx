import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Check,
  Sparkles,
  RefreshCw,
  Flame,
  Droplets,
  ArrowRight,
  ShieldCheck,
  Upload,
  Compass,
  Zap,
  Leaf,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';
import { api, FALLBACK_PRODUCTS } from '../services/api';
import { Product, Order } from '../types';
import { CartDrawer } from '../components/CartDrawer';
import { PaymentModal } from '../components/PaymentModal';
import { CheckoutAddressModal } from '../components/CheckoutAddressModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { AuthModal } from '../components/AuthModal';
import { BeverageImageUploadModal } from '../components/BeverageImageUploadModal';

export const ShopPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null);

  // Modals state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  
  // Auth Modal trigger for unauthenticated users clicking "Buy"
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingProductToBuy, setPendingProductToBuy] = useState<Product | null>(null);

  // Admin image replacement state
  const [adminUploadProduct, setAdminUploadProduct] = useState<Product | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  // Load products (the 8 signature drinks)
  const fetchProducts = async () => {
    try {
      const res = await api.getProducts();
      const activeProducts = (res.products || []).filter((p) => p.active !== 0);
      if (activeProducts.length > 0) {
        setProducts(activeProducts);
      }
    } catch (err) {
      console.warn('Using client fallback products:', err);
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle Buy / Add to Cart: Prompts login modal if unauthenticated or blocks if out of stock
  const handleBuyClick = (product: Product) => {
    const remaining = product.remaining_quantity !== undefined ? product.remaining_quantity : (product.total_quantity !== undefined ? product.total_quantity : 50);
    if (remaining <= 0) {
      return;
    }

    if (!user) {
      setPendingProductToBuy(product);
      setIsAuthModalOpen(true);
      return;
    }

    addItem(product, 1);
    setAddedAnimationId(product.id);
    setTimeout(() => {
      setAddedAnimationId(null);
    }, 1200);

    openCart();
  };

  const handleAuthSuccess = (productToAdd?: Product | null) => {
    if (productToAdd) {
      const remaining = productToAdd.remaining_quantity !== undefined ? productToAdd.remaining_quantity : (productToAdd.total_quantity !== undefined ? productToAdd.total_quantity : 50);
      if (remaining > 0) {
        addItem(productToAdd, 1);
        openCart();
      }
      setPendingProductToBuy(null);
    }
  };

  const handlePaymentSuccess = (order: Order) => {
    setConfirmedOrder(order);
  };

  return (
    <div className="min-h-screen pb-20">
      
      {/* Aesthetic Gen-Z Banner: Transparent Frosted Glassmorphism with Lime Color Combination */}
      <section className="relative overflow-hidden border-b border-lime-300/40 bg-gradient-to-b from-[#f4faf2]/90 via-white/80 to-[#f0f7ef]/60 py-12 sm:py-16 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900/90 dark:to-lime-950/20 backdrop-blur-md">
        {/* Transparent with Lime, White & Soft Grey Ambient Color Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-lime-300/25 via-emerald-100/15 to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 h-96 w-96 rounded-full bg-lime-400/15 blur-3xl pointer-events-none dark:bg-lime-900/15" />
        <div className="absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-slate-200/40 blur-3xl pointer-events-none dark:bg-slate-800/20" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            {/* Refined Pill Header */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-slate-800 shadow-xs border border-lime-300/70 dark:bg-slate-900/90 dark:text-slate-200 dark:border-slate-800 mb-4">
              <span className="flex h-2 w-2 rounded-full bg-lime-500 animate-pulse" />
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-lime-900 dark:text-lime-400">
                Aurra Blast Beverages
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                The 8 Flavors
              </span>
            </div>
            
            {/* Title with natural fresh lime & botanical energy accents */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1]">
              The Next Generation <br />
              <span className="bg-gradient-to-r from-lime-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                of Clean Energy.
              </span>
            </h1>
            
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-xl">
              {user ? (
                <>
                  Welcome back, <strong className="font-bold text-slate-900 dark:text-white">{user.name}</strong>. Enjoy natural sparkling botanical energy powered by green tea extract, crisp mineral carbonation, and pure fruit juice.
                </>
              ) : (
                <>
                  Next-generation sparkling botanical energy. Infused with cold-pressed Persian limes, wild berries, and Alphonso mangoes. Light, crisp, zero taurine jitters, and less than 50 calories per can.
                </>
              )}
            </p>

            {/* Natural Fruit Badges & Details */}
            <div className="mt-6 flex flex-wrap items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-md px-3 py-1.5 border border-lime-300/60 shadow-xs dark:bg-slate-900/80 dark:border-slate-800">
                <Leaf className="h-3.5 w-3.5 text-lime-600" />
                <span>Cold-Pressed Botanicals</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-md px-3 py-1.5 border border-slate-200/80 shadow-xs dark:bg-slate-900/80 dark:border-slate-800">
                <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                <span>Real Fruit Extract</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-md px-3 py-1.5 border border-slate-200/80 shadow-xs dark:bg-slate-900/80 dark:border-slate-800">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>&lt; 50 kcal / Can</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-white/80 backdrop-blur-md px-3 py-1.5 border border-slate-200/80 shadow-xs dark:bg-slate-900/80 dark:border-slate-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>UPI Instant Payment</span>
              </div>
            </div>

            {/* CTA Row */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#menu"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all active:scale-95 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 text-lime-400 dark:text-lime-600" />
                <span>Explore Flavors of Aurra</span>
              </a>

              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 backdrop-blur-md px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 transition-colors"
              >
                <Compass className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Our Vision &amp; Estate</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area: Flavors of Aurra Menu */}
      <main id="menu" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 border-b border-slate-200/80 pb-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Flavors of Aurra
              </h2>
              <span className="rounded-full bg-lime-500/15 px-2.5 py-0.5 text-xs font-bold text-lime-800 dark:bg-lime-400/20 dark:text-lime-300 border border-lime-400/30">
                8 Signature Flavors
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Crafted with clean botanicals, effervescent bubbles, and real fruit puree. Click &quot;Buy&quot; to order with instant UPI.
            </p>
          </div>
        </div>

        {/* Product Grid: Shows the 7 Drinks */}
        {loadingProducts ? (
          <div className="flex h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-500">Loading Aurra beverage drinks menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const isAdded = addedAnimationId === product.id;
              const remaining = product.remaining_quantity !== undefined ? product.remaining_quantity : (product.total_quantity !== undefined ? product.total_quantity : 50);
              const isOutOfStock = remaining <= 0;

              return (
                <div
                  key={product.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-200 ${
                    isOutOfStock
                      ? 'border-slate-200/60 bg-slate-50/60 opacity-90 dark:border-slate-800/60 dark:bg-slate-900/60'
                      : 'border-slate-200/80 bg-white hover:-translate-y-1 hover:shadow-xl dark:border-slate-800/80 dark:bg-slate-900'
                  }`}
                >
                  {/* Beverage Image Frame */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={
                        product.image_url?.startsWith('/src/assets/images/')
                          ? product.image_url.replace('/src/assets/images/', '/assets/images/')
                          : (product.image_url || '/assets/images/hero_beverage_can_1793439801479.jpg')
                      }
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className={`h-full w-full object-cover object-center transition-transform duration-300 ${
                        isOutOfStock ? 'grayscale contrast-75' : 'group-hover:scale-105'
                      }`}
                      onError={(e) => {
                        const img = e.currentTarget as HTMLImageElement;
                        if (!img.dataset.hasFallenBack) {
                          img.dataset.hasFallenBack = 'true';
                          img.src = '/assets/images/hero_beverage_can_1793439801479.jpg';
                        }
                      }}
                    />

                    {/* Prominent Out of Stock Overlay Badge */}
                    {isOutOfStock ? (
                      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] flex items-center justify-center p-3 text-center">
                        <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg border border-rose-400">
                          Out of Stock
                        </span>
                      </div>
                    ) : remaining <= 10 ? (
                      /* Low Stock Indicator */
                      <div className="absolute top-2.5 left-2.5 rounded-lg bg-amber-500/90 text-white px-2 py-0.5 text-[10px] font-extrabold backdrop-blur-xs shadow-xs">
                        Only {remaining} left!
                      </div>
                    ) : null}
                    
                    {/* Volume & calorie tag */}
                    <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-xs">
                      {product.volume} · {product.calories} kcal
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                          {product.name}
                        </h3>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                          ₹{product.price}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400/90">
                        {product.flavor}
                      </p>

                      <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed dark:text-slate-300">
                        {product.description}
                      </p>
                    </div>

                    {/* Buy Now / Out of Stock button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      {isOutOfStock ? (
                        <button
                          type="button"
                          disabled
                          className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-bold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed border border-slate-300/60 dark:border-slate-700/60"
                        >
                          <AlertCircle className="h-4 w-4" />
                          <span>Out of Stock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleBuyClick(product)}
                          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 px-4 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Added to Cart!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="h-4 w-4" />
                              <span>Buy · ₹{product.price}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Cart Drawer */}
      <CartDrawer
        onProceedToCheckout={() => {
          if (!user) {
            setIsAuthModalOpen(true);
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
        onSuccess={handlePaymentSuccess}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        order={confirmedOrder}
        onClose={() => setConfirmedOrder(null)}
        onViewOrders={() => {
          // Navigates directly to dedicated /orders route with pending orders tab
          window.location.href = '/orders?tab=pending';
        }}
      />

      {/* Auth Modal (Prompted when visitor clicks Buy without logging in) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        pendingProductToBuy={pendingProductToBuy}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Admin Image Replacement Studio Modal */}
      <BeverageImageUploadModal
        isOpen={Boolean(adminUploadProduct)}
        product={adminUploadProduct}
        onClose={() => setAdminUploadProduct(null)}
        onSuccess={() => {
          fetchProducts();
          setAdminUploadProduct(null);
        }}
      />

    </div>
  );
};
