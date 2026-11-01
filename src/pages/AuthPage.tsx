import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User as UserIcon, ArrowRight, Sparkles, CheckCircle2, AlertCircle, RefreshCw, KeyRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { user, login, signup, verifyEmail, resendCode, adminLogin, loading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign in form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Admin Login state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('adminaurra@beverages.com');
  const [adminPassword, setAdminPassword] = useState('admin');

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [signupSuccessMessage, setSignupSuccessMessage] = useState<string | null>(null);

  // Email verification state
  const [verifyingEmail, setVerifyingEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodePreview, setDevCodePreview] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  // Redirect logged-in users straight to /
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSignupSuccessMessage(null);
    setLoginLoading(true);

    try {
      const res = await login(loginEmail, loginPassword);
      if (res.user) {
        navigate('/');
      }
    } catch (err: any) {
      if (err.data?.requiresVerification) {
        // Needs email verification
        setVerifyingEmail(err.data.email);
        setDevCodePreview(err.data.devVerificationCode || null);
      } else {
        setLoginError(err.message || 'Invalid email or password');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await adminLogin(adminEmail, adminPassword);
      if (res.user) {
        navigate('/admin');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials. Use adminaurra@beverages.com / admin');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccessMessage(null);

    // Frontend validation
    if (signupPassword.length < 8) {
      setSignupError('Password must be at least 8 characters long');
      return;
    }

    setSignupLoading(true);

    try {
      const res = await signup(signupName, signupEmail, signupPassword);
      // FLOW REQUIREMENT:
      // After a successful sign-up, do NOT log the user in automatically.
      // Instead, redirect them to the Sign-In / Login page.
      // The user must manually enter their registered email and password on the sign-in page to log into the application.
      setActiveTab('signin');
      setLoginEmail(signupEmail);
      setLoginPassword('');
      setSignupSuccessMessage(res.message || 'Account created successfully! Please enter your password to sign in.');
      setSignupName('');
      setSignupPassword('');
    } catch (err: any) {
      setSignupError(err.message || 'Failed to sign up. Email might already be registered.');
    } finally {
      setSignupLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingEmail) return;

    setVerifyError(null);
    setVerifyLoading(true);

    try {
      await verifyEmail(verifyingEmail, verificationCode);
      navigate('/');
    } catch (err: any) {
      setVerifyError(err.message || 'Invalid verification code');
    } finally {
      setVerifyLoading(false);
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
      setResendStatus('A new code has been sent!');
      setTimeout(() => setResendStatus(null), 3500);
    } catch {
      setResendStatus('Failed to resend code');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        
        {/* Brand Kicker */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 font-black text-white text-base shadow-md mb-3 tracking-tight">
            ABB
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Aurra Blast Beverages
          </h1>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Micro-brewed botanical sparklers with cold-pressed natural fruits
          </p>
        </div>

        {/* Verification Screen Modal/View */}
        {verifyingEmail ? (
          <div className="relative rounded-2xl border border-slate-200/90 bg-white p-7 pt-10 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {/* Close Cross Button */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="absolute top-3.5 right-3.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
              title="Close and return to store"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-3">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Verify Your Email
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                We sent a 6-digit confirmation code to:
              </p>
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                {verifyingEmail}
              </p>
            </div>

            {/* Dev Inbox Simulation Callout */}
            {devCodePreview && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Dev Preview Inbox:
                  </span>
                  <button
                    type="button"
                    onClick={() => setVerificationCode(devCodePreview)}
                    className="underline text-[11px] font-bold text-amber-900 hover:text-black dark:text-amber-300 dark:hover:text-white"
                  >
                    Auto-Fill Code
                  </button>
                </div>
                <div className="mt-1 text-base tracking-widest font-mono font-bold text-amber-900 dark:text-amber-100">
                  {devCodePreview}
                </div>
              </div>
            )}

            {verifyError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <form onSubmit={handleVerify} className="mt-5 space-y-4">
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
                disabled={verifyLoading || verificationCode.length !== 6}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {verifyLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Confirm & Enter Shop</span>}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setVerifyingEmail(null)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  ← Back to Login
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
          /* Normal Auth Tabs: Sign In / Create Account */
          <div className="relative rounded-2xl border border-slate-200/90 bg-white p-7 pt-10 shadow-xl transition-colors dark:border-slate-800 dark:bg-slate-900">
            {/* Close Cross Button: allows users to close pop-up before login */}
            <button
              type="button"
              onClick={() => navigate('/')}
              className="absolute top-3.5 right-3.5 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
              title="Close and return to store"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Tab switch */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 mb-6 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setLoginError(null);
                  setSignupError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
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
                  setLoginError(null);
                  setSignupError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Sign In Form or Admin Sign In */}
            {activeTab === 'signin' && (
              isAdminMode ? (
                /* Admin Login View */
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div className="rounded-xl bg-purple-50 p-3 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      Sign in as Administrator
                    </span>
                    <p className="text-[11px] text-purple-700/80 dark:text-purple-400 mt-1">
                      Credentials: <span className="font-mono font-bold">adminaurra@beverages.com</span> / <span className="font-mono font-bold">admin</span>
                    </p>
                  </div>

                  {loginError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

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
                        placeholder="adminaurra@beverages.com"
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
                    disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-purple-700 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loginLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Sign In as Admin</span>}
                  </button>

                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMode(false);
                        setLoginError(null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                    >
                      ← Back to Member Login
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  {signupSuccessMessage && (
                    <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span className="font-bold">Account created!</span>
                        <p className="mt-0.5 text-[11px]">{signupSuccessMessage}</p>
                      </div>
                    </div>
                  )}

                  {loginError && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
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
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {loginLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Sign In to Shop</span>}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-[11px] text-slate-400">Secured session</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMode(true);
                        setLoginError(null);
                      }}
                      className="text-[11px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 hover:underline cursor-pointer"
                    >
                      Login as Admin
                    </button>
                  </div>
                </form>
              )
            )}

            {/* Sign Up Form */}
            {activeTab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-4">
                {signupError && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{signupError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
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
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
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
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••"
                      minLength={8}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Account privilege:
                  </span>{' '}
                  New user registrations are assigned customer club member role by default.
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-60"
                >
                  {signupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Create Account & Verify</span>}
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
