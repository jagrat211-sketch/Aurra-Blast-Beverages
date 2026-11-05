import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Mail, ShieldCheck, Calendar, LogOut, Package, Check, Edit2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  onViewOrders: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  orders,
  onViewOrders,
}) => {
  const { user, logout, updateProfile } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
    }
  }, [user?.name, isOpen]);

  if (!isOpen || !user) return null;

  const currentOrdersCount = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
  const pastOrdersCount = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled').length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setUpdating(true);
    setErrorMsg(null);
    setUpdateMsg(null);
    try {
      await updateProfile(nameInput.trim());
      setIsEditingName(false);
      setUpdateMsg('Profile name updated successfully!');
      setTimeout(() => setUpdateMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile name');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Profile Card Header */}
        <div className="flex flex-col items-center text-center pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative mb-3.5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-orange-400 to-rose-400 p-1 shadow-lg shadow-amber-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-900 text-2xl font-black text-amber-600 dark:text-amber-400 uppercase">
              {user.name?.charAt(0) || 'A'}
            </div>
            <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs ring-2 ring-white dark:ring-slate-900">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Name & Edit Toggle */}
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1 w-full max-w-xs">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-xl border border-amber-300 px-3 py-1.5 text-center text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={updating}
                className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition-colors shrink-0"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setNameInput(user.name);
                }}
                className="rounded-xl border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 shrink-0"
              >
                Cancel
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {user.name}
              </h3>
              <button
                onClick={() => setIsEditingName(true)}
                title="Edit name"
                className="rounded-md p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            <span>{user.email}</span>
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
              Verified Member
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
              {user.role === 'admin' ? 'Store Administrator' : 'Aurra Club Member'}
            </span>
          </div>

          {updateMsg && (
            <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              <span>{updateMsg}</span>
            </p>
          )}
          {errorMsg && (
            <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* Member Stats */}
        <div className="mt-6 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-2xl bg-amber-50/60 p-3 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Current Orders
            </span>
            <p className="mt-0.5 text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {currentOrdersCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Past Orders
            </span>
            <p className="mt-0.5 text-lg font-black text-slate-800 dark:text-slate-200 tabular-nums">
              {pastOrdersCount}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Spent
            </span>
            <p className="mt-0.5 text-lg font-black text-slate-900 dark:text-white tabular-nums">
              ₹{totalSpent}
            </p>
          </div>
        </div>

        {/* Account Details Details */}
        <div className="mt-6 space-y-2.5 rounded-2xl bg-slate-50/70 p-4 text-xs dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <UserIcon className="h-3.5 w-3.5 text-slate-400" />
              Member ID
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
              {user.id}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Member Since
            </span>
            <span className="font-semibold text-slate-900 dark:text-white">
              {user.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '2026'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Default Payment
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              Unified Payments Interface (UPI)
            </span>
          </div>
        </div>

        {/* Actions: View Orders & Logout session */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => {
              onClose();
              onViewOrders();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-4 text-xs font-bold text-white shadow-md hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.99]"
          >
            <Package className="h-4 w-4" />
            <span>My Orders (Current & Past Orders)</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-red-50/60 py-2.5 px-4 text-xs font-bold text-red-600 hover:bg-red-100/80 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors active:scale-[0.99]"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout Session</span>
          </button>
        </div>
      </div>
    </div>
  );
};
