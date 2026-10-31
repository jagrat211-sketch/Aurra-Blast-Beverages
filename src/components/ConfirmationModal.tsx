import React from 'react';
import { CheckCircle, Calendar, Hash, ArrowRight, Package } from 'lucide-react';
import { Order } from '../types';

interface ConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
  onViewOrders: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ order, onClose, onViewOrders }) => {
  if (!order) return null;

  const formattedDate = new Date(order.created_at || (order as any).createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
        
        {/* Success Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 mb-4 shadow-xs">
          <CheckCircle className="h-8 w-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Order Confirmed!</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Thank you for choosing Aurra. Your fresh sparkling artisan beverages are being prepared.
        </p>

        {/* Order Details Card */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-800 dark:bg-slate-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Hash className="h-3.5 w-3.5" />
              Order Number
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white truncate max-w-[160px]">
              {order.id}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              Placed At
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {formattedDate}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Package className="h-3.5 w-3.5" />
              Items
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {order.items?.length || 0} Flavors
            </span>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between text-sm font-bold text-slate-900 dark:text-white">
            <span>Total Amount Paid</span>
            <span className="tabular-nums text-amber-600 dark:text-amber-400">
              ₹{order.total}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => {
              onClose();
              onViewOrders();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-semibold text-white shadow-sm hover:bg-amber-600 transition-colors"
          >
            <span>View in My Orders</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 px-4 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
};
