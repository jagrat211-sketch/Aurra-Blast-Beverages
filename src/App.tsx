import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { FeatureFlagProvider, useFeatureFlags } from './context/FeatureFlagContext';
import { Navbar } from './components/Navbar';
import { ShopPage } from './pages/ShopPage';
import { AboutStoryPage } from './pages/AboutStoryPage';
import { AurraTributePage } from './pages/AurraTributePage';
import { AdminPage } from './pages/AdminPage';
import { AuthPage } from './pages/AuthPage';
import { TermsAndPrivacyPage } from './pages/TermsAndPrivacyPage';
import { OrdersPage } from './pages/OrdersPage';

// Route guard for /aurra: When enabled, open to all (logged in or guest). When disabled, hidden from regular users.
const AurraRouteGuard: React.FC = () => {
  const { isAuraTributeEnabled } = useFeatureFlags();
  const { user } = useAuth();

  if (!isAuraTributeEnabled && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <AurraTributePage />;
};

// Route guard for /admin: Strictly restricted to users with role === 'admin'
const AdminRouteGuard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <AdminPage />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FeatureFlagProvider>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-[#f7f8fa] text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
              {/* Light Aesthetic Gen-Z Shaded Top Bar */}
              <Navbar />

              {/* Routes */}
              <div className="flex-1">
                <Routes>
                  {/* Storefront, Buy Option & Shopping Cart */}
                  <Route path="/" element={<ShopPage />} />

                  {/* Dedicated Aurra Tribute Page (Controlled by dynamic feature flag) */}
                  <Route path="/aurra" element={<AurraRouteGuard />} />

                  {/* Our Vision, Estate Address & Verified Testimonials */}
                  <Route path="/about" element={<AboutStoryPage />} />

                  {/* Combined Terms and Conditions and Privacy Policy page (linked in footer) */}
                  <Route path="/terms-and-privacy" element={<TermsAndPrivacyPage />} />
                  <Route path="/terms" element={<Navigate to="/terms-and-privacy" replace />} />
                  <Route path="/privacy" element={<Navigate to="/terms-and-privacy" replace />} />

                  {/* Dedicated My Orders Page (Current & Past Orders tabs) */}
                  <Route path="/orders" element={<OrdersPage />} />

                  {/* Optional /auth direct route and Admin panel */}
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/admin" element={<AdminRouteGuard />} />
                  
                  {/* Fallback & aliases */}
                  <Route path="/shop" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>

            {/* Aesthetic Gen-Z Footer */}
            <footer className="border-t border-amber-200/40 bg-white/95 py-8 dark:border-slate-800 dark:bg-slate-900 text-xs text-slate-500 dark:text-slate-400">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
                  <span className="font-extrabold text-slate-900 dark:text-white">Aurra Blast Beverages</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">The Next Generation of Energy.</span>
                </div>

                {/* Terms and Privacy policy page links - exclusively in footer, shifted towards the right */}
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400 sm:ml-auto">
                  <Link
                    to="/terms-and-privacy"
                    className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors underline decoration-slate-300 dark:decoration-slate-700 underline-offset-3"
                  >
                    Terms &amp; Conditions
                  </Link>
                  <span>·</span>
                  <Link
                    to="/terms-and-privacy"
                    className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors underline decoration-slate-300 dark:decoration-slate-700 underline-offset-3"
                  >
                    Privacy Policy
                  </Link>
                  <span>·</span>
                  <span>Crafted in India</span>
                </div>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </FeatureFlagProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}
