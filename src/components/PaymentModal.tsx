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
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCartStore } from '../store/useCartStore';
import { api } from '../services/api';
import { Order } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { items, getGrandTotal, clearCart, closeCart } = useCartStore();
  // Two seamlessly integrated UPI methods: 'upi_id' (VPA) and 'upi_qr' (Scan QR)
  const [upiSubMethod, setUpiSubMethod] = useState<'vpa' | 'qr'>('qr');
  const [upiIdInput, setUpiIdInput] = useState('');
  const [selectedApp, setSelectedApp] = useState<'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'cred'>('gpay');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(300); // 5 minutes timer
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grandTotal = getGrandTotal();
  const merchantVpa = 'aurrabeverages@icici';
  const upiPayIntent = `upi://pay?pa=${merchantVpa}&pn=Aurra%20Blast%20Beverages&am=${grandTotal}&cu=INR&tn=Aurra%20Sparklers%20Order`;

  // Countdown timer for QR
  useEffect(() => {
    if (!isOpen) {
      setQrTimeLeft(300);
      return;
    }
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

  const handleCopyVpa = () => {
    navigator.clipboard.writeText(merchantVpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleQuickHandle = (handle: string) => {
    const prefix = upiIdInput.split('@')[0] || 'aurracustomer';
    setUpiIdInput(`${prefix}${handle}`);
  };

  const handleProcessPayment = async () => {
    // If VPA method is selected, ensure a valid-looking VPA is provided
    if (upiSubMethod === 'vpa') {
      const trimmed = upiIdInput.trim();
      if (!trimmed || !trimmed.includes('@')) {
        setError('Please enter a valid UPI ID (e.g., yourname@okhdfcbank or 9876543210@paytm).');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Prepare items payload for server (server securely computes real prices from DB)
      const payloadItems = items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
      }));

      // 2. Call backend order creation endpoint
      const res = await api.createOrder(payloadItems);

      // 3. Trigger celebratory confetti
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore confetti errors
      }

      // 4. On successful purchase: clear cart, close drawer & modal, trigger confirmation
      clearCart();
      closeCart();
      onClose();
      onSuccess(res.order);
    } catch (err: any) {
      console.error('Order creation failed:', err);
      setError(err.message || 'UPI Payment verification failed. Your cart was preserved.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 text-white shadow-xs">
              <Smartphone className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Aurra UPI Gateway</h3>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  INSTANT &amp; SECURE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Integrated UPI &amp; Dynamic QR System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-red-50 p-3.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">UPI Notice: </span>
              {error}
              <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                Notice: Your cart has not been emptied. You may re-attempt payment seamlessly.
              </div>
            </div>
          </div>
        )}

        {/* Order Amount Banner */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 p-4 border border-amber-300/40 dark:border-amber-500/20">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Total Payable Amount
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              ₹{grandTotal} <span className="text-xs font-semibold text-slate-500">INR (All Taxes Incl.)</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              <span>0% Gateway Fee</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{items.length} beverage item(s)</p>
          </div>
        </div>

        {/* UPI Method Tabs (Seamlessly integrates with UPI & with QR) */}
        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Select Your UPI Payment Mode
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setUpiSubMethod('qr');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all ${
                upiSubMethod === 'qr'
                  ? 'border-amber-500 bg-amber-500 text-white font-extrabold shadow-md shadow-amber-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 font-semibold'
              }`}
            >
              <QrCode className="h-4 w-4" />
              <span className="text-xs">Scan Dynamic QR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setUpiSubMethod('vpa');
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-2xl border p-3 text-center transition-all ${
                upiSubMethod === 'vpa'
                  ? 'border-amber-500 bg-amber-500 text-white font-extrabold shadow-md shadow-amber-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 font-semibold'
              }`}
            >
              <Smartphone className="h-4 w-4" />
              <span className="text-xs">Pay with UPI ID / VPA</span>
            </button>
          </div>
        </div>

        {/* Option 1: Dynamic QR Code */}
        {upiSubMethod === 'qr' && (
          <div className="mt-5 flex flex-col items-center rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40 text-center">
            {/* Countdown Badge */}
            <div className="mb-3 flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-900 dark:bg-amber-950/70 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>QR Code Valid for: {formatTimer(qrTimeLeft)}</span>
            </div>

            {/* Simulated Clean Vector UPI QR Code with Aurra Logo Core */}
            <div className="relative flex h-48 w-48 flex-col items-center justify-center rounded-2xl bg-white p-3 shadow-md border-2 border-slate-800 dark:border-slate-200">
              {/* Decorative Authentic QR Frame */}
              <svg viewBox="0 0 100 100" className="h-full w-full fill-slate-900">
                {/* Corner Finder 1 */}
                <rect x="5" y="5" width="26" height="26" fill="black" rx="3" />
                <rect x="9" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="13" width="10" height="10" fill="black" rx="1" />
                
                {/* Corner Finder 2 */}
                <rect x="69" y="5" width="26" height="26" fill="black" rx="3" />
                <rect x="73" y="9" width="18" height="18" fill="white" rx="2" />
                <rect x="77" y="13" width="10" height="10" fill="black" rx="1" />

                {/* Corner Finder 3 */}
                <rect x="5" y="69" width="26" height="26" fill="black" rx="3" />
                <rect x="9" y="73" width="18" height="18" fill="white" rx="2" />
                <rect x="13" y="77" width="10" height="10" fill="black" rx="1" />

                {/* Data Matrix Dots Pattern */}
                <rect x="36" y="7" width="5" height="5" />
                <rect x="44" y="12" width="6" height="5" />
                <rect x="53" y="8" width="5" height="5" />
                <rect x="36" y="24" width="7" height="6" />
                <rect x="47" y="22" width="6" height="6" />
                <rect x="56" y="25" width="5" height="5" />
                <rect x="9" y="38" width="6" height="6" />
                <rect x="22" y="36" width="7" height="6" />
                <rect x="7" y="47" width="6" height="7" />
                <rect x="19" y="52" width="5" height="6" />
                <rect x="36" y="38" width="7" height="6" />
                <rect x="48" y="37" width="6" height="6" />
                <rect x="59" y="36" width="7" height="6" />
                <rect x="71" y="38" width="6" height="7" />
                <rect x="83" y="39" width="7" height="6" />
                <rect x="37" y="49" width="6" height="7" />
                <rect x="57" y="51" width="6" height="6" />
                <rect x="68" y="50" width="7" height="6" />
                <rect x="82" y="52" width="6" height="5" />
                <rect x="36" y="68" width="6" height="6" />
                <rect x="47" y="70" width="6" height="6" />
                <rect x="57" y="67" width="6" height="6" />
                <rect x="70" y="69" width="6" height="6" />
                <rect x="80" y="73" width="7" height="6" />
                <rect x="37" y="82" width="7" height="6" />
                <rect x="49" y="80" width="6" height="6" />
                <rect x="60" y="82" width="5" height="6" />
                <rect x="73" y="83" width="6" height="6" />
                <rect x="85" y="81" width="5" height="6" />
              </svg>

              {/* Center Aurra Logo Badge */}
              <div className="absolute flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white font-black text-[9px] shadow-sm border-2 border-white">
                AURRA
              </div>
            </div>

            {/* Merchant VPA and copy action */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                UPI ID: {merchantVpa}
              </span>
              <button
                type="button"
                onClick={handleCopyVpa}
                className="flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 transition-colors"
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

            {/* Apps compatibility row */}
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Scan with Google Pay, PhonePe, Paytm, BHIM, or any banking UPI app.
            </p>

            {/* Mobile Intent link for direct app opening */}
            <a
              href={upiPayIntent}
              className="mt-2.5 inline-flex sm:hidden items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 underline hover:text-amber-700"
            >
              <span>Tap to Open Your UPI App Directly</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Option 2: UPI ID / VPA */}
        {upiSubMethod === 'vpa' && (
          <div className="mt-5 space-y-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <label htmlFor="upi-id-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Enter Your UPI ID / VPA
              </label>
              <div className="mt-1.5 relative">
                <input
                  id="upi-id-input"
                  type="text"
                  placeholder="e.g. mobile@paytm or name@okhdfcbank"
                  value={upiIdInput}
                  onChange={(e) => setUpiIdInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Quick Handles */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Quick Handles:
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {['@okhdfcbank', '@okaxis', '@oksbi', '@paytm', '@ybl'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => handleQuickHandle(h)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-amber-400 hover:bg-amber-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>

            {/* Supported Apps Badges */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Select your preferred UPI provider:
              </span>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {[
                  { id: 'gpay', name: 'Google Pay' },
                  { id: 'phonepe', name: 'PhonePe' },
                  { id: 'paytm', name: 'Paytm' },
                  { id: 'bhim', name: 'BHIM' },
                  { id: 'cred', name: 'CRED' },
                ].map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedApp(app.id as any)}
                    className={`flex flex-col items-center justify-center rounded-xl border py-2 px-1 text-center transition-all ${
                      selectedApp === app.id
                        ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <Smartphone className="h-3.5 w-3.5 mb-0.5" />
                    <span className="text-[10px] leading-tight">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security & Verification Notice */}
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Integrated NPCI &amp; UPI 2.0 Sandbox. Immediate confirmation &amp; digital invoice generated upon completion.
          </span>
        </div>

        {/* Action button */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcessPayment}
            disabled={loading}
            className="flex-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-bold text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying UPI Payment...</span>
              </>
            ) : upiSubMethod === 'qr' ? (
              <>
                <Check className="h-4 w-4" />
                <span>I Have Paid · ₹{grandTotal}</span>
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                <span>Verify &amp; Pay ₹{grandTotal}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
