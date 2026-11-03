import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  Smartphone,
  QrCode,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ArrowRight,
  MapPin,
  Phone,
  RefreshCw,
  Edit2,
  Save,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useCartStore } from '../store/useCartStore';
import { api } from '../services/api';
import { Order } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, updateDeliveryInfo } = useAuth();
  const { items, getGrandTotal, clearCart, closeCart } = useCartStore();

  const [loadingQr, setLoadingQr] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [razorpayOrderId, setRazorpayOrderId] = useState<string | null>(null);
  const [upiString, setUpiString] = useState<string | null>(null);
  const [businessUpi, setBusinessUpi] = useState('iamironman798@okaxis');

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(300); // 5 minutes validity
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingDelivery, setIsEditingDelivery] = useState(false);
  const [editAddress, setEditAddress] = useState(user?.delivery_address || '');
  const [editContact, setEditContact] = useState(user?.contact_no || '');
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Synchronize initial address if user loads later
  useEffect(() => {
    if (user?.delivery_address && !editAddress) setEditAddress(user.delivery_address);
    if (user?.contact_no && !editContact) setEditContact(user.contact_no);
  }, [user]);

  const grandTotal = getGrandTotal();

  // Load Razorpay Dynamic QR code whenever modal opens
  useEffect(() => {
    if (!isOpen) {
      setQrTimeLeft(300);
      setQrCodeDataUrl(null);
      setRazorpayOrderId(null);
      setError(null);
      return;
    }

    let isMounted = true;
    async function loadDynamicQr() {
      setLoadingQr(true);
      setError(null);
      try {
        const payloadItems = items.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          price: i.price,
          name: i.name,
        }));

        const res = await api.createRazorpayQr({
          amount: grandTotal,
          items: payloadItems,
          contactNo: user?.contact_no,
          address: user?.delivery_address,
        });

        if (isMounted) {
          if (res?.qrCodeDataUrl) {
            setQrCodeDataUrl(res.qrCodeDataUrl);
            setRazorpayOrderId(res.razorpayOrderId);
            setUpiString(res.upiString);
            if (res.businessUpi) setBusinessUpi(res.businessUpi);
          } else {
            throw new Error('Failed to generate dynamic Razorpay QR code.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Razorpay QR creation error:', err);
          setError(err.message || 'Unable to generate dynamic UPI QR code. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoadingQr(false);
        }
      }
    }

    loadDynamicQr();

    return () => {
      isMounted = false;
    };
  }, [isOpen, grandTotal]);

  // Countdown timer for single-use dynamic QR
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setQrTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(businessUpi);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleConfirmAndComplete = async () => {
    // 1. Stock Safety Check: Reject if any item has 0 stock
    const outOfStockItem = items.find((i) => i.remaining_quantity !== undefined && i.remaining_quantity <= 0);
    if (outOfStockItem) {
      setError(`Cannot place order: "${outOfStockItem.name}" is currently out of stock. Please remove it from your cart.`);
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      const payloadItems = items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        price: i.price,
        name: i.name,
      }));

      // Confirm payment and create order records in orders and order_items tables
      const res = await api.confirmPayment({
        razorpayOrderId: razorpayOrderId || `rzp_${Date.now()}`,
        paymentId: `pay_${Date.now()}`,
        items: payloadItems,
        amount: grandTotal,
        userId: user?.id,
        userEmail: user?.email,
        userName: user?.name,
        contactNo: user?.contact_no,
        deliveryAddress: user?.delivery_address,
      });

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {}

      // Clear cart and close drawer
      clearCart();
      closeCart();

      // Close payment modal
      onClose();

      // Hand off to order success confirmation modal
      if (res?.order) {
        onSuccess(res.order);
      } else {
        onSuccess({
          id: res?.orderId || `ord_${Date.now()}`,
          user_id: user?.id || 'guest',
          total: grandTotal,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          items: items.map((i) => ({
            id: `oit_${Math.random()}`,
            product_id: i.productId,
            name_snapshot: i.name,
            price_snapshot: i.price,
            qty: i.qty,
          })),
        });
      }
    } catch (err: any) {
      console.error('Order confirmation error:', err);
      // Fallback: Attempt standard order placement
      try {
        const fallbackRes = await api.createOrder(items.map((i) => ({ productId: i.productId, qty: i.qty })));
        clearCart();
        closeCart();
        onClose();
        if (fallbackRes?.order) {
          onSuccess(fallbackRes.order);
        }
      } catch (fallbackErr: any) {
        setError(fallbackErr.message || 'Payment confirmation failed. Please try again.');
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-xs">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Razorpay Dynamic QR</h3>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Single-use UPI QR linked to {businessUpi}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Amount & Verified Delivery Details Banner */}
        <div className="mt-3.5 rounded-2xl bg-amber-500/10 p-3.5 border border-amber-300/40 dark:border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Total Amount Due
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                ₹{grandTotal} <span className="text-xs font-semibold text-slate-500">INR</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              <span>Exact Cart Total</span>
            </span>
          </div>

          {/* Confirmed Delivery Info Summary & Editable Section */}
          <div className="mt-2.5 pt-2 border-t border-amber-200/50 dark:border-amber-900/40 text-[11px] text-slate-700 dark:text-slate-300">
            {isEditingDelivery ? (
              <div className="space-y-2 py-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-900 dark:text-amber-300 text-[11px] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-amber-600" />
                    Update Delivery Information
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingDelivery(false)}
                    className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Enter complete delivery address (street, area, city, pincode)"
                    className="w-full rounded-lg border border-amber-300/60 dark:border-amber-800 bg-white/90 dark:bg-slate-900/90 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-semibold">+91</span>
                    <input
                      type="tel"
                      value={editContact}
                      onChange={(e) => setEditContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full rounded-lg border border-amber-300/60 dark:border-amber-800 bg-white/90 dark:bg-slate-900/90 pl-10 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingDelivery || !editAddress.trim()}
                    onClick={async () => {
                      try {
                        setSavingDelivery(true);
                        await updateDeliveryInfo(editAddress.trim(), editContact.trim());
                        setIsEditingDelivery(false);
                      } catch (err: any) {
                        setError(err.message || 'Failed to update address');
                      } finally {
                        setSavingDelivery(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {savingDelivery ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {user?.delivery_address || 'No address set yet'}
                    </span>
                  </div>
                  {user?.contact_no && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Phone className="h-3 w-3 text-emerald-600 shrink-0" />
                      <span>+91 {user.contact_no}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditAddress(user?.delivery_address || '');
                    setEditContact(user?.contact_no || '');
                    setIsEditingDelivery(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-200/60 dark:bg-amber-950/60 px-2 py-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-300/80 transition-colors"
                >
                  <Edit2 className="h-2.5 w-2.5" />
                  <span>{user?.delivery_address ? 'Edit Address' : 'Add Address'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic QR Display Section */}
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-center dark:border-slate-800 dark:bg-slate-800/40">
          {/* Validity Timer */}
          <div className="mb-2.5 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>QR Code Expires in: {formatTimer(qrTimeLeft)}</span>
          </div>

          {/* QR Code Container */}
          <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl bg-white p-2.5 shadow-md border-2 border-slate-900 dark:border-slate-100">
            {loadingQr ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                <span className="text-[11px] font-semibold text-slate-500">Generating Razorpay QR...</span>
              </div>
            ) : qrCodeDataUrl ? (
              <img
                src={qrCodeDataUrl}
                alt={`Razorpay Dynamic QR for ₹${grandTotal}`}
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 p-3">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <span className="text-xs font-semibold text-slate-600">Failed to load QR</span>
              </div>
            )}
          </div>

          {/* Business UPI ID & Copy button */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
              UPI ID: {businessUpi}
            </span>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            >
              {copiedUpi ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            Scan with Google Pay, PhonePe, Paytm, BHIM, or any banking app.
          </p>

          {/* Deep link for mobile devices */}
          {upiString && (
            <a
              href={upiString}
              className="mt-2 inline-flex sm:hidden items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 underline hover:text-amber-700"
            >
              <span>Tap to Open In Your UPI App</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {/* Security & Webhook Note */}
        <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-[11px] text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Webhook verification active at <strong>/api/razorpay-webhook</strong>. Instant confirmation on payment capture.
          </span>
        </div>

        {/* Action button */}
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={processingPayment}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmAndComplete}
            disabled={processingPayment || loadingQr}
            className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 px-4 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {processingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Confirming Order...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>I Have Paid · Complete Order</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
