import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Sun,
  Moon,
  LogOut,
  ShieldCheck,
  Zap,
  User as UserIcon,
  ChevronDown,
  Clock,
  CheckCircle2,
  Settings as SettingsIcon,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { useCartStore } from '../store/useCartStore';
import { SettingsModal } from './SettingsModal';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAuraTributeEnabled } = useFeatureFlags();
  const navigate = useNavigate();
  const itemsCount = useCartStore((state) => state.getTotalCount());
  const openCart = useCartStore((state) => state.openCart);

  // User Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    await logout();
    navigate('/');
  };

  const handleNavigateOrders = (tab: 'current' | 'past') => {
    setIsDropdownOpen(false);
    navigate(`/orders?tab=${tab}`);
  };

  const handleOpenSettings = () => {
    setIsDropdownOpen(false);
    setIsSettingsOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-slate-900/90">
        <div className="mx-auto flex h-17 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          
          {/* Zone 1: Logo Lockup as shown in user reference image */}
          <Link
            to="/"
            className="group flex items-center gap-3 transition-transform hover:scale-[1.01] shrink-0"
          >
            {/* Circular Emblem Badge matching screenshot image_8e1cc92f.png */}
            <div className="relative flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border-2 border-amber-400 bg-white shadow-xs ring-2 ring-amber-200/40 transition-transform group-hover:rotate-6 dark:border-amber-400 dark:bg-slate-900">
              <span className="text-[8px] font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none text-center">
                AURRA
              </span>
              <span className="text-[7.5px] font-black uppercase tracking-tight text-amber-500 leading-none mt-0.5">
                BLAST
              </span>
              <span className="mt-0.5 rounded-full bg-emerald-500 px-1.5 py-[0.5px] text-[6px] font-black tracking-wider text-white leading-none">
                BEV
              </span>
            </div>

            {/* Typography Lockup: Aurra Blast [BEVERAGES] */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  Aurra Blast
                </span>
                <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black tracking-wider text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                  BEVERAGES
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-tight flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500 fill-amber-400" />
                The Next Generation of Energy.
              </span>
            </div>
          </Link>

          {/* Zone 2: Navigation Links (The 8 Flavors, Our Vision & Estate - My Orders kept strictly in dropdown) */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-bold text-slate-700 dark:text-slate-300">
            <Link
              to="/"
              className="hover:text-amber-600 transition-colors dark:hover:text-amber-400 whitespace-nowrap shrink-0"
            >
              Flavors of Aurra
            </Link>

            <Link
              to="/about"
              className="hover:text-amber-600 transition-colors dark:hover:text-amber-400 whitespace-nowrap shrink-0"
            >
              Our Vision &amp; Estate
            </Link>

            {isAuraTributeEnabled && (
              <Link
                to="/aurra"
                className="group flex items-center gap-1.5 font-extrabold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-400 animate-pulse group-hover:rotate-12 transition-transform" />
                <span>Aurra</span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/80 px-1.5 py-0.2 text-[8.5px] font-black tracking-wider text-amber-800 dark:text-amber-300 ml-0.5">
                  TRIBUTE
                </span>
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 font-bold transition-colors dark:text-emerald-400 dark:hover:text-emerald-300 whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Studio
              </Link>
            )}
          </nav>

          {/* Zone 3: Actions (Theme, Cart & Logged-In User Dropdown) */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Cart Drawer Trigger */}
            {user && (
              <button
                onClick={openCart}
                aria-label="Open cart drawer"
                className="relative flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline">Cart</span>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-black text-white tabular-nums">
                  {itemsCount}
                </span>
              </button>
            )}

            {/* Logged in User with Interactive Dropdown */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 py-1.5 px-2.5 sm:px-3 text-left transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:bg-slate-700/80 cursor-pointer shadow-xs"
                >
                  {/* User Avatar */}
                  {user.user_profile || user.avatar_url ? (
                    <img
                      src={user.user_profile || user.avatar_url}
                      alt={user.name}
                      className="h-7 w-7 rounded-lg object-cover border border-emerald-400 shadow-xs"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 text-white font-black text-xs uppercase shadow-xs">
                      {user.name?.charAt(0) || <UserIcon className="h-3.5 w-3.5" />}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[110px] leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                      {user.role === 'admin' ? 'Store Admin' : 'Club Member'}
                    </span>
                  </div>

                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Mini Card */}
                    <div className="px-3 py-2.5 mb-1 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9.5px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          Verified Member
                        </span>
                        <span className="text-[9.5px] font-semibold text-slate-400">
                          ID: {user.id.slice(0, 10)}
                        </span>
                      </div>
                    </div>

                    {/* Dropdown Navigation Actions */}
                    <div className="space-y-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => handleNavigateOrders('current')}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>My Current Orders</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNavigateOrders('past')}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>My Past Orders</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenSettings}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <SettingsIcon className="h-4 w-4 text-purple-500" />
                        <span>Settings</span>
                      </button>
                    </div>

                    {/* Divider & Logout Session */}
                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout Session</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
