import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Plus,
  Image as ImageIcon,
  Upload,
  Database,
  Users,
  Activity,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  Clock,
  Sparkles,
  Sliders,
  ExternalLink,
  Globe,
  Trash2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { api } from '../services/api';
import { Product, CartEventRecord } from '../types';
import { BeverageImageUploadModal } from '../components/BeverageImageUploadModal';

export const BEVERAGE_CATEGORIES = [
  'Botanical Sparkler',
  'Artisan Cold Brew',
  'Zero-Sugar Tonic',
  'Hydration Elixir',
  'Fruit Infusion',
  'Sparkling Adaptogen',
  'Herbal Spritz',
  'Citrus Soda Craft',
] as const;

export const AdminPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAuraTributeEnabled, toggleAuraTribute, setAuraTributeEnabled, loading: flagLoading } = useFeatureFlags();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'products' | 'events' | 'users' | 'sql' | 'features'>('products');
  
  // Modal for uploading and associating beverage images
  const [selectedProductForUpload, setSelectedProductForUpload] = useState<Product | null>(null);

  // Overview stats
  const [stats, setStats] = useState<{ totalUsers: number; totalOrders: number; totalRevenue: number; totalCartEvents: number } | null>(null);
  
  // Products management
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // New product form with full Inventory & Stock Management fields
  const [productForm, setProductForm] = useState({
    id: '',
    name: '',
    flavor: '',
    price: '' as string | number,
    image_url: '',
    description: '',
    volume: '',
    calories: '' as string | number,
    category: '',
    total_quantity: 50,
    remaining_quantity: 50,
    active: 1,
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [savingProduct, setSavingProduct] = useState(false);
  const [productSuccess, setProductSuccess] = useState<string | null>(null);

  // Cart Events
  const [cartEvents, setCartEvents] = useState<CartEventRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Users
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState<'user' | 'admin' | 'all'>('user');

  // Deleting product state & confirmation modal
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  // SQL Query console
  const [queryInput, setQueryInput] = useState<string>(
    `SELECT u.name as customer, count(o.id) as order_count, COALESCE(sum(o.total), 0) as total_spent_inr\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.id\nORDER BY total_spent_inr DESC;`
  );
  const [queryResults, setQueryResults] = useState<{ rows: any[]; rowCount: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [runningQuery, setRunningQuery] = useState(false);

  // Restrict to admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
      } else if (user.role !== 'admin') {
        navigate('/shop');
      }
    }
  }, [user, authLoading, navigate]);

  const loadOverview = async () => {
    try {
      const res = await api.getAdminOverview();
      setStats(res.stats);
    } catch (err) {
      console.warn('Failed to load overview:', err);
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await api.getProducts();
      setProducts(res.products || []);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCartEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await api.getAdminCartEvents(150);
      setCartEvents(res.events || []);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.getAdminUsers();
      setUsersList(res.users || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadOverview();
      loadProducts();
    }
  }, [user]);

  // Tab change loader
  useEffect(() => {
    if (activeTab === 'events') loadCartEvents();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'products') loadProducts();
  }, [activeTab]);

  // Handle local image file upload (converts to high-quality base64 data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setProductForm((prev) => ({ ...prev, image_url: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert('Please enter a beverage name');
      return;
    }
    if (!productForm.flavor.trim()) {
      alert('Please enter flavor notes');
      return;
    }
    if (productForm.price === '' || Number(productForm.price) <= 0) {
      alert('Please enter a valid price in ₹ INR');
      return;
    }
    if (!productForm.volume.trim()) {
      alert('Please enter beverage volume (e.g. 330ml)');
      return;
    }
    if (productForm.calories === '' || Number(productForm.calories) < 0) {
      alert('Please enter calorie count (e.g. 40)');
      return;
    }
    if (!productForm.category) {
      alert('Please select a beverage category from the dropdown');
      return;
    }
    if (!productForm.description.trim()) {
      alert('Please enter a beverage description');
      return;
    }
    if (!productForm.image_url) {
      alert('Please choose an image file for this beverage');
      return;
    }

    setSavingProduct(true);
    setProductSuccess(null);

    try {
      await api.saveProduct({
        ...productForm,
        price: Number(productForm.price),
        calories: Number(productForm.calories),
        total_quantity: Number(productForm.total_quantity),
        remaining_quantity: Number(productForm.remaining_quantity),
      });

      setProductSuccess('Beverage flavor saved successfully to database!');
      setTimeout(() => setProductSuccess(null), 3000);
      setIsEditingProduct(false);
      loadProducts();
      loadOverview();
      // Reset form to blank defaults, leaving total and remaining stock as 50
      setProductForm({
        id: '',
        name: '',
        flavor: '',
        price: '',
        image_url: '',
        description: '',
        volume: '',
        calories: '',
        category: '',
        total_quantity: 50,
        remaining_quantity: 50,
        active: 1,
      });
      setImagePreview('');
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setSavingProduct(false);
    }
  };

  const promptDeleteProduct = (p: Product) => {
    setProductToDelete(p);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    const beverageName = target.beverage_name || target.name;
    setDeletingProduct(true);
    try {
      await api.deleteProduct(target.id, beverageName);
      setProducts((prev) =>
        prev.filter(
          (item) =>
            item.id !== target.id &&
            item.name !== beverageName &&
            (item as any).beverage_name !== beverageName
        )
      );
      loadOverview();
      setProductToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      // Still filter out from local view
      setProducts((prev) =>
        prev.filter(
          (item) =>
            item.id !== target.id &&
            item.name !== beverageName &&
            (item as any).beverage_name !== beverageName
        )
      );
      setProductToDelete(null);
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleRunQuery = async (queryText?: string) => {
    const sql = queryText || queryInput;
    setRunningQuery(true);
    setQueryError(null);
    try {
      const res = await api.runAdminSqlQuery(sql);
      setQueryResults(res);
    } catch (err: any) {
      setQueryError(err.message || 'SQL execution failed');
      setQueryResults(null);
    } finally {
      setRunningQuery(false);
    }
  };

  // Pre-canned SQL queries
  const cannedQueries = [
    {
      title: 'Users & Purchases by Total Spent',
      query: `SELECT u.name, u.email, count(o.id) as order_count, COALESCE(sum(o.total), 0) as total_spent_inr\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nGROUP BY u.id\nORDER BY total_spent_inr DESC;`,
    },
    {
      title: 'Cart Add/Remove History by Date',
      query: `SELECT ce.created_at, u.name as customer, p.name as product, ce.action, ce.qty\nFROM cart_events ce\nJOIN users u ON u.id = ce.user_id\nJOIN products p ON p.id = ce.product_id\nORDER BY ce.created_at DESC\nLIMIT 50;`,
    },
    {
      title: 'Most Popular Beverages Ordered',
      query: `SELECT oi.name_snapshot as flavor, sum(oi.qty) as total_units_sold, sum(oi.qty * oi.price_snapshot) as total_sales_inr\nFROM order_items oi\nGROUP BY oi.name_snapshot\nORDER BY total_units_sold DESC;`,
    },
    {
      title: 'Cart Drop-off / Abandonment Check',
      query: `SELECT ce.action, count(*) as event_count\nFROM cart_events ce\nGROUP BY ce.action;`,
    },
  ];

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Aurra Admin Console
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Store operations, beverage asset management, live cart telemetry, and SQLite diagnostics
          </p>
        </div>

        <button
          onClick={() => {
            loadOverview();
            if (activeTab === 'events') loadCartEvents();
            if (activeTab === 'users') loadUsers();
            if (activeTab === 'products') loadProducts();
          }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Revenue</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            ₹{stats?.totalRevenue ?? 0}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {stats?.totalOrders ?? 0} orders processed
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Registered Users</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats?.totalUsers ?? 0}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Verified customers</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Cart Events Logged</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats?.totalCartEvents ?? 0}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Add / remove actions</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Flavors</span>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {products.length}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">In storefront catalog</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex border-b border-slate-200 dark:border-slate-800 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'products'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Flavors of Aurra Catalog</span>
        </button>

        <button
          onClick={() => setActiveTab('events')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'events'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Live Cart Events Stream</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'users'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customer Accounts</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'sql'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>SQL Query Diagnostics</span>
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`pb-3 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'features'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="h-4 w-4" />
          <span>Feature Settings</span>
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.2 text-[9px] font-black text-emerald-700 dark:text-emerald-300">
            5th Tab
          </span>
        </button>
      </div>

      {/* TAB 1: Products & Image Upload */}
      {activeTab === 'products' && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Beverage Flavors</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create new flavors, upload can/bottle photos, or update catalog pricing
              </p>
            </div>
            <button
              onClick={() => {
                setIsEditingProduct(!isEditingProduct);
                setProductForm({
                  id: '',
                  name: '',
                  flavor: '',
                  price: '',
                  image_url: '',
                  description: '',
                  volume: '',
                  calories: '',
                  category: '',
                  total_quantity: 50,
                  remaining_quantity: 50,
                  active: 1,
                });
                setImagePreview('');
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 py-2 px-3.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{isEditingProduct ? 'Close Editor' : 'Add New Beverage'}</span>
            </button>
          </div>

          {/* New / Edit Product Form */}
          {isEditingProduct && (
            <form
              onSubmit={handleSaveProduct}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{productForm.id ? 'Edit Beverage' : 'New Beverage Formulation'}</span>
              </h3>

              {productSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{productSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Beverage Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    required
                    placeholder="e.g. Ruby Grapefruit Sparkle"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Flavor Notes <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productForm.flavor}
                    onChange={(e) => setProductForm({ ...productForm, flavor: e.target.value })}
                    required
                    placeholder="e.g. Pink Grapefruit & Crushed Rosemary"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Price (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    required
                    placeholder="e.g. 159"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Volume &amp; Calories <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={productForm.volume}
                      onChange={(e) => setProductForm({ ...productForm, volume: e.target.value })}
                      required
                      placeholder="e.g. 330ml"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                    <input
                      type="number"
                      min="0"
                      value={productForm.calories}
                      onChange={(e) => setProductForm({ ...productForm, calories: e.target.value })}
                      required
                      placeholder="e.g. 40 kcal"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Inventory & Stock Management Fields */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Total Stock Quantity (Can/Bottle Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.total_quantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setProductForm((prev) => ({
                        ...prev,
                        total_quantity: val,
                        // If creating new product, also default remaining quantity to total quantity
                        remaining_quantity: prev.id ? prev.remaining_quantity : val,
                      }));
                    }}
                    required
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Remaining Quantity (Live Stock in Database)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.remaining_quantity}
                    onChange={(e) => setProductForm({ ...productForm, remaining_quantity: Number(e.target.value) })}
                    required
                    placeholder="e.g. 50"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="" disabled>-- Select Beverage Category --</option>
                  {BEVERAGE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  rows={2}
                  required
                  placeholder="Artisan tasting notes and natural botanical ingredients..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Image Upload Area */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Upload className="h-4 w-4 text-amber-500" />
                  <span>Beverage Image: Choose File <span className="text-rose-500">*</span></span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800 flex items-center justify-center">
                    {imagePreview || productForm.image_url ? (
                      <img
                        src={imagePreview || productForm.image_url}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      required={!productForm.image_url}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:py-2 file:px-4 file:text-xs file:font-semibold file:text-white hover:file:bg-amber-600 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Upload your can, bottle, or beverage photo (PNG, JPG, WebP).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 disabled:opacity-50"
                >
                  {savingProduct ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Save Beverage</span>}
                </button>
              </div>
            </form>
          )}

          {/* Storage Status Banner */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
                <Upload className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Beverage Image Engine: Local Persistent Storage + Cloudinary CDN
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Images can be uploaded via local file picker, Cloudinary unsigned preset, or direct URL. Associated directly with <code>products.image_url</code>.
                </p>
              </div>
            </div>
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              ZERO-EXPIRATION ACTIVE
            </span>
          </div>

          {/* Product cards list in admin */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-3">
                  <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-[9px] text-white text-center py-0.5 backdrop-blur-xs">
                      {p.volume}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</h4>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums">₹{p.price}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{p.flavor}</p>
                    
                    {/* Live Remaining Stock Indicator for Admin */}
                    <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
                      <span className="text-slate-400">{p.calories} kcal · {p.volume}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${
                          (p.remaining_quantity ?? 50) <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                            : (p.remaining_quantity ?? 50) <= 10
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
                        }`}
                        title="Remaining stock tracked in database"
                      >
                        <span>Remaining:</span>
                        <strong className="font-mono text-[11px]">{p.remaining_quantity ?? 50}</strong>
                        <span className="text-[9px] text-slate-500 dark:text-slate-400">/ {p.total_quantity ?? 50}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => promptDeleteProduct(p)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProduct(true);
                      setProductForm({
                        id: p.id,
                        name: p.beverage_name || p.name,
                        flavor: p.flavor_notes || p.flavor,
                        price: p.price,
                        image_url: p.image_url,
                        description: p.description,
                        volume: p.volume,
                        calories: p.calories,
                        category: p.category || 'Botanical Sparkler',
                        total_quantity: p.total_quantity ?? 50,
                        remaining_quantity: p.remaining_quantity ?? 50,
                        active: p.active,
                      });
                      setImagePreview(p.image_url);
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    Edit Formulation &amp; Stock
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Live Cart Events */}
      {activeTab === 'events' && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cart Activity Telemetry</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every add, remove, and quantity adjustment logged with server timestamp
              </p>
            </div>
            <button
              onClick={loadCartEvents}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingEvents ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Beverage</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold text-right">Resulting Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {cartEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No cart events recorded yet.
                    </td>
                  </tr>
                ) : (
                  cartEvents.map((evt) => {
                    const formatted = new Date(evt.created_at).toLocaleString('en-IN', {
                      dateStyle: 'short',
                      timeStyle: 'medium',
                    });

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {formatted}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                          <div>{evt.user_name}</div>
                          <div className="text-[10px] text-slate-400">{evt.user_email}</div>
                        </td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                          {evt.product_name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              evt.action === 'add'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : evt.action === 'remove'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {evt.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                          {evt.qty}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Users */}
      {activeTab === 'users' && (
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registered Users</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customer accounts from users table (default: role user)
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-400">Filter Role:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="user">Users (Default)</option>
                  <option value="admin">Admins</option>
                  <option value="all">All Roles</option>
                </select>
              </div>

              <button
                onClick={loadUsers}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Delivery Address</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Contact No.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usersList
                  .filter((u) => {
                    if (userRoleFilter === 'all') return true;
                    const role = (u.role || 'user').toLowerCase();
                    return role === userRoleFilter.toLowerCase();
                  })
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                        {u.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={u.delivery_address || ''}>
                        {u.delivery_address || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {u.email || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-200">
                        {u.contact_no ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">+91</span>
                            <span>{u.contact_no}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                {usersList.filter((u) => {
                  if (userRoleFilter === 'all') return true;
                  const role = (u.role || 'user').toLowerCase();
                  return role === userRoleFilter.toLowerCase();
                }).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400">
                      No registered {userRoleFilter === 'all' ? '' : userRoleFilter} accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SQL Query Runner */}
      {activeTab === 'sql' && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              SQLite Query Diagnostics & Analytics
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Run custom SELECT queries or run pre-canned reports for purchases and cart history
            </p>
          </div>

          {/* Canned Query Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cannedQueries.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQueryInput(item.query);
                  handleRunQuery(item.query);
                }}
                className="flex flex-col text-left rounded-xl border border-slate-200 bg-white p-3 hover:border-amber-500 hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</span>
                <span className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">Click to execute →</span>
              </button>
            ))}
          </div>

          {/* Query Box */}
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3.5 font-mono text-xs text-emerald-400 focus:border-amber-500 focus:outline-none dark:border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Safety rule: Read-only SELECT statements allowed.
              </span>
              <button
                onClick={() => handleRunQuery()}
                disabled={runningQuery}
                className="flex items-center gap-2 rounded-xl bg-amber-500 py-2 px-5 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {runningQuery ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Run Query</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error */}
          {queryError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {queryError}
            </div>
          )}

          {/* Results Table */}
          {queryResults && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Returned {queryResults.rowCount} row(s)
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
                {queryResults.rows.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400">Query returned 0 rows.</div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        {Object.keys(queryResults.rows[0]).map((key) => (
                          <th key={key} className="py-2 px-3 font-semibold font-mono">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {queryResults.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 font-mono text-[11px]">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="py-2 px-3 text-slate-800 dark:text-slate-200">
                              {String(val ?? 'NULL')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Feature Settings (Fifth tab beside SQL Query Diagnostics) */}
      {activeTab === 'features' && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-xs">
                  <Sliders className="h-4 w-4" />
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Feature Settings
                </h2>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300">
                  Fifth Tab · Dynamic Flags
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage dynamic storefront capabilities and custom navigation modules
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <span className={`h-2 w-2 rounded-full ${isAuraTributeEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                Aura Tribute: {isAuraTributeEnabled ? 'ONLINE' : 'HIDDEN'}
              </span>
            </div>
          </div>

          {/* Feature Card: Enable Aura Tribute */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 shadow-xs">
                    <Sparkles className="h-4 w-4 fill-amber-400" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Enable Aura Tribute</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isAuraTributeEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isAuraTributeEnabled ? 'Visible to Users' : 'Hidden from Regular Users'}
                      </span>
                    </h3>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                  When this toggle is turned <strong>ON</strong>, a new menu item called <strong>&ldquo;Aurra&rdquo;</strong> will dynamically appear in the navigation bar right beside the right side of our vision &amp; estate menu. As long as this toggle remains on, the page will keep appearing and be accessible at <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-amber-600 dark:bg-slate-800 dark:text-amber-400">/aurra</code> whether User/Admin is logged in or not logged in.
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Clicking it opens the dedicated tribute page featuring the inspiring story of <strong>Aurra Bhatnagar Badoni</strong> and our 8 signature &ldquo;Aurra&rdquo; beverage flavors (Aurra Berry Blast, Aurra Peach Ice Tea, etc.). When the toggle is <strong>OFF</strong>, this menu and page are completely hidden from regular users.
                </p>
              </div>

              {/* Dynamic Toggle Switch */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAuraTributeEnabled}
                  disabled={flagLoading}
                  onClick={() => toggleAuraTribute()}
                  className={`relative inline-flex h-8 w-16 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                    isAuraTributeEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${
                      isAuraTributeEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-[11px] font-semibold text-slate-500">
                  {isAuraTributeEnabled ? 'Toggle is ON' : 'Toggle is OFF'}
                </span>
              </div>
            </div>

            {/* Cloud Sync Note: Required by user specification */}
            <div className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-amber-900 dark:text-amber-200">
                    Database Integration &amp; Supabase Synchronizer Note
                  </p>
                  <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>( This Enable Aura Tribute will be synced with Supabase in future)</strong>. The current state is persisted locally and backed by the local SQLite runtime database, ready for direct connection to Supabase cloud RPC synchronization.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500">
                Route path: <span className="font-mono text-slate-700 dark:text-slate-300">/aurra</span> · Title: <span className="font-bold text-slate-700 dark:text-slate-300">AURRA</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAuraTributeEnabled(true)}
                  disabled={isAuraTributeEnabled}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Force ON
                </button>
                <button
                  type="button"
                  onClick={() => setAuraTributeEnabled(false)}
                  disabled={!isAuraTributeEnabled}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Force OFF
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/aurra')}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors"
                >
                  <span>Preview Tribute Page</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Beverage Image Upload Studio Modal */}
      <BeverageImageUploadModal
        isOpen={Boolean(selectedProductForUpload)}
        product={selectedProductForUpload}
        onClose={() => setSelectedProductForUpload(null)}
        onSuccess={(updatedProduct) => {
          setProducts((prev) =>
            prev.map((item) => (item.id === updatedProduct.id ? updatedProduct : item))
          );
          setSelectedProductForUpload(null);
          loadOverview();
        }}
      />

      {/* Delete Product Confirmation Pop-up Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mb-3">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Would you like to delete this product?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                "{productToDelete.beverage_name || productToDelete.name}"
              </span>
              <br />
              This will permanently delete this beverage from the catalog and database.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={deletingProduct}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                disabled={deletingProduct}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 shadow-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {deletingProduct ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Yes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
