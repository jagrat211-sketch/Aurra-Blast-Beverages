import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Edit2,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface CheckoutAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmed: () => void;
}

export const CheckoutAddressModal: React.FC<CheckoutAddressModalProps> = ({
  isOpen,
  onClose,
  onConfirmed,
}) => {
  const { user, updateDeliveryInfo } = useAuth();

  // Mode: 'confirm' (prompt asking "Is this your correct delivery address and mobile number?") or 'enter' (prompt to enter missing details or edit)
  const [mode, setMode] = useState<'confirm' | 'enter'>('confirm');

  const [address, setAddress] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or user profile changes
  useEffect(() => {
    if (!isOpen) return;

    const currentAddress = (user?.delivery_address || '').trim();
    const currentContact = (user?.contact_no || '').replace(/\D/g, '').trim();

    setAddress(currentAddress);
    setContactNo(currentContact);
    setError(null);

    // If either delivery address or mobile number is missing, system MUST block checkout and prompt to enter them
    if (!currentAddress || !currentContact || currentContact.length !== 10) {
      setMode('enter');
    } else {
      setMode('confirm');
    }
  }, [isOpen, user?.delivery_address, user?.contact_no]);

  if (!isOpen || !user) return null;

  const handleSaveAndConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAddress = address.trim();
    const cleanDigits = contactNo.replace(/\D/g, '');

    if (!cleanAddress) {
      setError('Please provide a complete delivery address (House/Flat, Street, Area, City, PIN).');
      return;
    }

    if (!cleanDigits || cleanDigits.length !== 10) {
      setError('Please provide a valid 10-digit Indian mobile number (+91).');
      return;
    }

    setSaving(true);
    try {
      // Ensure address and mobile number are successfully saved to database & user profile
      await updateDeliveryInfo(cleanAddress, cleanDigits);
      // Once successfully saved, proceed to show confirmation or open Razorpay dynamic QR
      setMode('confirm');
    } catch (err: any) {
      setError(err.message || 'Failed to save delivery details. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleProceedToPayment = () => {
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* MODE: CONFIRM EXISTING DETAILS */}
        {mode === 'confirm' ? (
          <div>
            {/* Header Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mb-4">
              <CheckCircle2 className="h-7 w-7" />
            </div>

            {/* Prompt Question */}
            <div className="text-center mb-6">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Delivery Verification
              </span>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Is this your correct delivery address and mobile number?
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Please confirm your shipping and contact information before opening the payment gateway.
              </p>
            </div>

            {/* Details Card */}
            <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              {/* Delivery Address */}
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mt-0.5">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Delivery Address
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 break-words leading-relaxed">
                    {user.delivery_address || address}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200/80 dark:border-slate-700/60" />

              {/* Mobile Number */}
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 mt-0.5">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Mobile Number
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                    +91 {user.contact_no || contactNo}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Yes (proceed) & Edit Details */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleProceedToPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Yes, Proceed to Payment</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setMode('enter')}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>No, Edit Details</span>
              </button>
            </div>
          </div>
        ) : (
          /* MODE: ENTER / UPDATE MISSING DETAILS */
          <div>
            {/* Header Icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 mb-3">
              <Building className="h-7 w-7" />
            </div>

            <div className="text-center mb-5">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Required for Checkout
              </span>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Enter Delivery Address &amp; Mobile Number
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Your delivery address and mobile number are required to fulfill your order and send live order updates.
              </p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveAndConfirm} className="space-y-4">
              {/* Delivery Address Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-amber-500" />
                  <span>Delivery Address</span>
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Complete Address (House/Flat No., Street, Area, City, PIN Code)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                  required
                />
              </div>

              {/* Mobile Number Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Mobile Number (India)</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-500 dark:text-slate-400 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-12 pr-3 text-xs font-mono font-bold text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  10-digit mobile number for delivery confirmation &amp; SMS notifications
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Profile &amp; Database...</span>
                    </>
                  ) : (
                    <>
                      <span>Save &amp; Continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {user.delivery_address && user.contact_no && (
                  <button
                    type="button"
                    onClick={() => setMode('confirm')}
                    className="w-full rounded-xl py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Security badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Address and mobile stored securely in database for order delivery</span>
        </div>
      </div>
    </div>
  );
};
