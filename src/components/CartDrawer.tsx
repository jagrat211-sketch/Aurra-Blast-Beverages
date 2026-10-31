import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const {
    items,
    isCartOpen,
    closeCart,
    setQty,
    removeItem,
    clearCart,
    getSubtotal,
    getTax,
    getShipping,
    getGrandTotal,
    isSyncing,
  } = useCartStore();

  if (!isCartOpen) return null;

  const subtotal = getSubtotal();
  const tax = getTax();
  const shipping = getShipping();
  const grandTotal = getGrandTotal();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl transition-all duration-300 dark:bg-slate-900 flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Cart</h2>
              {isSyncing && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  syncing
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {items.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={closeCart}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body items list */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Your cart is empty</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                  Explore our artisan fruit and botanical sparkling sodas to add some refreshment.
                </p>
                <button
                  onClick={closeCart}
                  className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  Discover Flavors
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-4 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-colors dark:border-slate-800/80 dark:bg-slate-800/50"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-700">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          // Fallback container
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </h4>
                          <span className="text-sm font-semibold text-slate-900 tabular-nums dark:text-white">
                            ₹{item.price * item.qty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {item.flavor}
                        </p>
                        <div className="text-[11px] text-slate-400">
                          ₹{item.price} each · {item.volume || '330ml'}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                          <button
                            onClick={() => setQty(item.productId, item.qty - 1)}
                            className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                            {item.qty}
                          </span>
                          <button
                            onClick={() => setQty(item.productId, item.qty + 1)}
                            className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                            title="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Remove item */}
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer & Order summary */}
          {items.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-white">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Tax (5%)</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-white">₹{tax}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-white">
                    {shipping === 0 ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Free</span> : `₹${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Add ₹{499 - subtotal} more for Free Delivery!
                  </p>
                )}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total Due</span>
                  <span className="tabular-nums">₹{grandTotal}</span>
                </div>
              </div>

              <button
                onClick={onProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 px-4 text-sm font-semibold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99]"
              >
                <span>Proceed to Purchase</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>Mock Payment Simulator · No card details collected</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
