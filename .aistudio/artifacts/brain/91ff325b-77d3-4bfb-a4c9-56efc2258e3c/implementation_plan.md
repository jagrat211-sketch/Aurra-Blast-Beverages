# Aurra Beverages — Full Implementation Plan & Specification

Comprehensive blueprint to implement all user requirements:
1. **The Complete 8 Drinks Menu** (including the confirmed 8th drink: **Aurra Berry Blast** with photo and stats).
2. **User Profile Dropdown** in the Navbar (My Current Orders, My Past Orders, Settings, and Logout Session).
3. **Dedicated Standalone Orders Page (`/orders`)** with clean tabs for Current Orders and Past Orders (replacing page-scrolling).
4. **Settings Modal** displaying Member ID, Member Since, Default Payment, Parent ID, and Membership status, with Avatar Photo Upload and Password Change capabilities.
5. **Light Aesthetic White Banner** on Homepage: Natural off-white/porcelain canvas, transparent frosted glass, natural fresh green and purple fruit accents, removing heavy orange and synthetic glow.
6. **Our Vision & Estate Banner Recoloring** on `/about`: Removing the blue banner in favor of a clean, natural botanical stone aesthetic.
7. **Corner Admin Sign-In Portal**: Bottom-corner badge opening an Admin Login modal with hardcoded `admin` / `admin` credentials, designed with clean architecture ready for future Supabase/S3 database integration.
8. **Graceful Order Authentication**: Preventing 401 exceptions for unauthenticated guest sessions.

---

## User Review & Confirmed Specifications

> [!IMPORTANT]
> **All 8 Aurra Signature Beverage Drinks Confirmed:**
> 1. **Aurra Sparkle Cranberry** (₹149 · 330ml · 42 kcal) — Tart Cranberry & Wild Botanicals
> 2. **Aurra Mint Mojito** (₹159 · 330ml · 38 kcal) — Fresh Garden Spearmint & Persian Lime
> 3. **Aurra Zesty Lime** (₹139 · 330ml · 32 kcal) — Crisp Citrus & Himalayan Sea Salt
> 4. **Aurra Mango Rush** (₹169 · 330ml · 54 kcal) — Ratnagiri Alphonso & Sunlit Citrus
> 5. **Aurra Fizz Orange** (₹149 · 330ml · 48 kcal) — Nagpur Mandarin & Valencia Orange
> 6. **Aurra Peach Iced Tea** (₹159 · 355ml · 40 kcal) — Darjeeling Black Tea & Ripe Golden Peach
> 7. **Aurra Passionfruit** (₹169 · 330ml · 44 kcal) — Tropical Passionfruit & Wild Citrus
> 8. **Aurra Berry Blast** (₹179 · 330ml · 46 kcal) — Wild Blackberry, Blueberry & Acai (confirmed with attached photo)

---

## 1. User Experience & Visual Design Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AURRA BLAST BEVERAGES                           │
│  [Logo] Aurra Beverages   Drinks Menu   Our Vision   [Cart] [User Name▼]│
└──────────────────────────────────────────────────────────────┬─────────┘
                                                               │ (Click name)
                                         ┌─────────────────────┴─────────┐
                                         │  📦 My Current Orders         │
                                         │  📜 My Past Orders            │
                                         │  ⚙️ Settings                  │
                                         │  ───────────────────────────  │
                                         │  ⏻  Logout Session            │
                                         └───────────────────────────────┘
```

### A. Light Aesthetic White Hero Banner
- **Canvas**: Clean crisp white/alabaster background (`#FFFFFF` / `bg-stone-50`), soft natural shadows.
- **Visual Composition**:
  - Transparent frosted glassmorphism card (`bg-white/80 backdrop-blur-md border border-slate-200/60`).
  - Natural fresh fruit accents: cool botanical green (`#10B981` Persian lime & mint leaf) and royal plum/berry purple (`#8B5CF6` wild blackberry & passionfruit).
  - High-res beverage bottle/can presentation with natural studio lighting.
  - Zero heavy dark overlays, zero neon or synthetic glowing effects.
- **Copy**: Editorial, clean typography: *"Next-generation artisan sparkling botanical sparklers crafted with real fruit extract, effervescent bubbles, and green tea antioxidants."*

### B. Our Vision & Estate Banner (`/about`)
- Removed outdated dark blue banner.
- Re-styled with a soothing, organic botanical stone/warm cream palette (`from-stone-100 via-emerald-50/40 to-slate-100 dark:from-slate-900 dark:to-stone-900`) that seamlessly matches the brand identity.

### C. User Dropdown Menu
- Located in the top-right header when logged in.
- Displays:
  - User avatar with initial & verified check
  - **My Current Orders** → navigates to `/orders?tab=current`
  - **My Past Orders** → navigates to `/orders?tab=past`
  - **Settings** → opens Settings modal
  - Separator
  - **Logout Session** → logs out user and terminates session

### D. Dedicated Orders Page (`/orders`)
- Separate standalone page route (`src/pages/OrdersPage.tsx`).
- No longer scrolls down on the homepage; provides an isolated, clutter-free orders dashboard.
- **Current Orders Tab**:
  - Live 4-stage tracking visual indicator (*Confirmed → Chilling & Carbonating → Out for Delivery → Delivered*).
  - Item snapshots and prices in ₹ INR.
  - Action button: *"Mark as Delivered"* (advances order to Past Orders).
- **Past Orders Tab**:
  - All delivered/fulfilled orders with green check completion badges.
  - 1-click *"Reorder"* button to quickly repopulate cart.
  - Detailed invoice view.

### E. User Settings Modal
- Modal displaying:
  1. **Member ID**: Formatted ID (e.g. `AURRA-MEM-7821`)
  2. **Member Since**: User join date (e.g. `March 2026`)
  3. **Default Payment**: `Unified Payments Interface (UPI)`
  4. **Parent ID**: `AURRA-DIST-IND-01` (or custom referrer)
  5. **Membership Badge**: `Verified Member` / `Aurra Club Member`
- **Interactive Features**:
  - **Change Password**: Form with fields: *Current Password*, *New Password (min. 8 chars)*, and *Confirm Password*, with real-time validation and success notification.
  - **Profile Photo Upload**: User can upload an avatar image (with live preview and persistence).

### F. Corner Admin Sign-In Portal
- Floating badge in bottom-right corner: `Admin Sign-In` with shield icon.
- Clicking opens the **Admin Login Modal**.
- Pre-configured with hardcoded credentials:
  - **Username**: `admin`
  - **Password**: `admin`
- On success: logs in with store administrator privileges and redirects to `/admin` Studio.
- Backend code structured with modular adapter functions, allowing immediate future connection to a Supabase or AWS S3 database.

---

## 2. Technical Architecture & File Plan

```
┌────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                  │
├─────────────────┬───────────────────┬──────────────────────────────────┤
│ Pages           │ Components        │ Modals & Overlays                │
│ • ShopPage      │ • Navbar (Dropdown│ • SettingsModal (Password/Photo) │
│ • OrdersPage    │ • CartDrawer      │ • AdminLoginModal (admin/admin)  │
│ • AboutStoryPage│ • ProductCard     │ • PaymentModal (Pure UPI & QR)   │
│ • LegalPage     │ • AdminBadge      │ • ConfirmationModal              │
│ • AuthPage      │ • OrderTracker    │ • BeverageUploadModal            │
└─────────────────┴───────────────────┴──────────────────────────────────┘
                                   │  HTTP /api/
┌──────────────────────────────────▼─────────────────────────────────────┐
│                           BACKEND & DB                                 │
├────────────────────────────────────────────────────────────────────────┤
│ Server: Express + tsx server.ts                                        │
│ Database: SQLite (/data/beverage_store.db)                             │
│ Endpoints:                                                             │
│ • /api/products (Returns all 8 active drinks)                          │
│ • /api/auth/me, /api/auth/profile, /api/auth/change-password           │
│ • /api/auth/avatar, /api/auth/admin-login (admin/admin)                │
│ • /api/orders (GET, POST), /api/orders/:id/status (PATCH)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Implementation Sequence

1. **Step 1: Database & 8th Beverage Sync (`server/db.ts`)**
   - Add `Aurra Berry Blast` (330ml · 46 kcal · ₹179 · Wild Blackberry, Blueberry & Acai) as an active product in `seedDefaultProducts()` and `initDatabase()`.
   - Ensure all 8 products are synced and active.

2. **Step 2: Backend Auth & Admin Login Extension (`server/routes.ts`)**
   - Add `POST /api/auth/admin-login`: validates `username === 'admin' && password === 'admin'`.
   - Add `PUT /api/auth/change-password`: validates password change.
   - Add `POST /api/auth/avatar`: persists user avatar.
   - Extend user model with `parent_id` and `avatar_url`.

3. **Step 3: Account Settings Modal (`src/components/SettingsModal.tsx`)**
   - Implement the complete modal with Member ID, Member Since, Default Payment, Parent ID, Verified status, Change Password, and Photo Upload.

4. **Step 4: Navbar User Dropdown (`src/components/Navbar.tsx`)**
   - Replace user greeting with an interactive dropdown menu containing:
     - My Current Orders
     - My Past Orders
     - Settings
     - Logout Session

5. **Step 5: Dedicated Orders Page (`src/pages/OrdersPage.tsx` & `src/App.tsx`)**
   - Create standalone `/orders` page with `Current Orders` and `Past Orders` tabs.
   - Update `App.tsx` routes. Remove bottom orders section from `ShopPage.tsx`.

6. **Step 6: Light Aesthetic Banner Redesign (`src/pages/ShopPage.tsx`)**
   - Redesign hero section with an airy white canvas, transparent glass card, and fresh green and purple fruit accents.

7. **Step 7: Vision & Estate Banner Recoloring (`src/pages/AboutStoryPage.tsx`)**
   - Replace blue banner with clean botanical stone/cream tone.

8. **Step 8: Bottom-Corner Admin Sign-In Badge & Modal (`src/components/AdminBadge.tsx`)**
   - Render discreet bottom-right corner badge opening the Admin Login modal with hardcoded `admin`/`admin` credentials.

9. **Step 9: Verification & Testing**
   - Verify all 8 beverages in menu.
   - Test user profile dropdown, `/orders` page, settings modal, password change, photo upload, and admin sign-in.
   - Run linter and compiler.
