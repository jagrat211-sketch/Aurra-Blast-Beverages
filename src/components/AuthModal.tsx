import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Sparkles, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingProductToBuy?: Product | null;
  onAuthSuccess: (productToAdd?: Product | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  pendingProductToBuy,
  onAuthSuccess,
}) => {
  const { login, signup, verifyEmail, resendCode, adminLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Admin login mode (as requested in screenshot 7 with purple arrow)
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('Admin@G.com');
  const [adminPassword, setAdminPassword] = useState('Admin');
  
  // Verification fields
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodePreview, setDevCodePreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminLogin(adminEmail, adminPassword);
      if (res.user) {
        onAuthSuccess(pendingProductToBuy);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials. Use Admin@G.com / Admin');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.user) {
        onAuthSuccess(pendingProductToBuy);
        onClose();
      }
    } catch (err: any) {
      if (err.data?.requiresVerification) {
        setVerifyingEmail(err.data.email);
        setDevCodePreview(err.data.devVerificationCode || null);
      } else {
        setError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await signup(name, email, password);
      if (res.requiresVerification) {
        setVerifyingEmail(res.email);
        setDevCodePreview(res.devVerificationCode || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingEmail) return;

    setError(null);
    setLoading(true);

    try {
      await verifyEmail(verifyingEmail, verificationCode);
      onAuthSuccess(pendingProductToBuy);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!verifyingEmail) return;
    setResendStatus('Resending...');
    try {
      const res = await resendCode(verifyingEmail);
      if (res.devVerificationCode) {
        setDevCodePreview(res.devVerificationCode);
      }
      setResendStatus('New code sent!');
      setTimeout(() => setResendStatus(null), 3000);
    } catch {
      setResendStatus('Failed to resend');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 sm:p-7 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 font-black text-white text-xs shadow-xs tracking-tight">
              ABB
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Aurra Blast Beverages</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {pendingProductToBuy ? `Log in to purchase ${pendingProductToBuy.name}` : 'The Next Generation of Energy.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Screen */}
        {verifyingEmail ? (
          <div className="mt-4 space-y-4">
            <div className="text-center">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Your Email</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Verification code sent to: <span className="font-semibold text-slate-800 dark:text-slate-200">{verifyingEmail}</span>
              </p>
            </div>

            {devCodePreview && (
              <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Dev Preview Code:
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerificationCode(devCodePreview)}
                    className="underline text-[11px] font-bold text-amber-900 dark:text-amber-300"
                  >
                    Auto-Fill
                  </button>
                </div>
                <div className="mt-1 font-mono text-base font-bold tracking-widest">{devCodePreview}</div>
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-center text-lg font-mono tracking-widest text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Verify & Continue Purchase</span>}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setVerifyingEmail(null)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400"
                >
                  {resendStatus || 'Resend code'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Sign In vs Sign Up Tabs */
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                className={`flex-1 py-1.5 rounded-lg transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {isAdminLogin ? (
              /* Dedicated Admin Sign-In Mode (Only Email & Password) */
              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div className="rounded-xl bg-purple-50 p-2.5 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                    Admin Portal Sign In
                  </span>
                  <p className="text-[10px] text-purple-700/80 dark:text-purple-400 mt-0.5">
                    Hardcoded credentials: <span className="font-mono font-bold">Admin@G.com</span> / <span className="font-mono font-bold">Admin</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Admin@G.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-purple-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Log In as Admin</span>}
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminLogin(false);
                      setError(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                  >
                    ← Back to Member Login
                  </button>
                </div>
              </form>
            ) : activeTab === 'signin' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Sign In & Buy</span>}
                </button>

                {/* Bottom right alternative link matching screenshot purple arrow */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminLogin(true);
                      setError(null);
                    }}
                    className="text-[10.5px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Sign in as Admin</span>
                    <span className="rounded bg-purple-100 dark:bg-purple-950 px-1 py-0.2 text-[9px] text-purple-700 dark:text-purple-300">HQ</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Password (min. 8 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400">
                  First registered user automatically receives store admin access.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Create Account</span>}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
