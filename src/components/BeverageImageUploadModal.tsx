import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Cloud,
  HardDrive,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { Product } from '../types';
import { api } from '../services/api';

interface BeverageImageUploadModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
}

export const BeverageImageUploadModal: React.FC<BeverageImageUploadModalProps> = ({
  isOpen,
  product,
  onClose,
  onSuccess,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'cloudinary' | 'url' | 'preset'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(product?.image_url || '');
  const [base64Data, setBase64Data] = useState<string>('');
  const [directUrl, setDirectUrl] = useState<string>('');
  
  // Cloudinary settings
  const [cloudName, setCloudName] = useState<string>('');
  const [uploadPreset, setUploadPreset] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !product) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, SVG)');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('File size exceeds 8MB limit. Please choose a smaller photo.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBase64Data(result);
      setPreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setBase64Data(result);
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndAssociate = async () => {
    setLoading(true);
    setError(null);
    setSuccessInfo(null);

    try {
      if (activeMode === 'url') {
        if (!directUrl.trim()) {
          setError('Please enter a valid image URL');
          setLoading(false);
          return;
        }
        const res = await api.updateProductImage(product.id, directUrl.trim());
        setSuccessInfo('Image URL associated with product!');
        setTimeout(() => {
          onSuccess(res.product);
          onClose();
        }, 1200);
        return;
      }

      if (activeMode === 'preset') {
        if (!previewUrl) {
          setError('Please select a preset image');
          setLoading(false);
          return;
        }
        const res = await api.updateProductImage(product.id, previewUrl);
        setSuccessInfo('Preset image applied to beverage!');
        setTimeout(() => {
          onSuccess(res.product);
          onClose();
        }, 1200);
        return;
      }

      // Upload mode (Local or Cloudinary)
      if (!base64Data) {
        setError('Please choose or drop an image file first');
        setLoading(false);
        return;
      }

      const cloudinaryConfig =
        activeMode === 'cloudinary' && cloudName && uploadPreset
          ? { cloudName: cloudName.trim(), uploadPreset: uploadPreset.trim() }
          : undefined;

      const res = await api.uploadBeverageImage({
        imageBase64: base64Data,
        filename: selectedFile?.name || `${product.id}.jpg`,
        productId: product.id,
        cloudinaryConfig,
      });

      const providerLabel = res.provider === 'cloudinary' ? 'Cloudinary CDN' : 'Local Persistent Storage';
      setSuccessInfo(`Image uploaded to ${providerLabel} and saved to database!`);

      setTimeout(() => {
        if (res.product) {
          onSuccess(res.product);
        } else {
          onSuccess({ ...product, image_url: res.url });
        }
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setError(err.message || 'Failed to upload and associate image.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Upload Beverage Image — {product.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Current flavor: {product.flavor} · Price: ₹{product.price}
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

        {/* Feedback messages */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successInfo && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Source Mode Selector */}
        <div className="mt-5 flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeMode === 'upload'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <HardDrive className="h-3.5 w-3.5 text-amber-500" />
            <span>Local Storage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('cloudinary')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeMode === 'cloudinary'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Cloud className="h-3.5 w-3.5 text-blue-500" />
            <span>Cloudinary CDN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('preset')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeMode === 'preset'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            <span>Artisan Presets</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
              activeMode === 'url'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5 text-emerald-500" />
            <span>Direct URL</span>
          </button>
        </div>

        {/* Content per mode */}
        <div className="mt-5 space-y-4">
          
          {/* Mode 1 & 2: Local / Cloudinary File Upload Drag-and-Drop */}
          {(activeMode === 'upload' || activeMode === 'cloudinary') && (
            <div className="space-y-3">
              {activeMode === 'cloudinary' && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
                  <div className="font-semibold mb-1">Direct Cloudinary Free Cloud Upload:</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[11px] block font-medium mb-0.5">Cloud Name</label>
                      <input
                        type="text"
                        placeholder="e.g. demo-cloud"
                        value={cloudName}
                        onChange={(e) => setCloudName(e.target.value)}
                        className="w-full rounded-lg border border-blue-300 bg-white p-1.5 text-xs text-slate-900 focus:outline-none dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] block font-medium mb-0.5">Unsigned Upload Preset</label>
                      <input
                        type="text"
                        placeholder="e.g. beverage_preset"
                        value={uploadPreset}
                        onChange={(e) => setUploadPreset(e.target.value)}
                        className="w-full rounded-lg border border-blue-300 bg-white p-1.5 text-xs text-slate-900 focus:outline-none dark:border-blue-700 dark:bg-slate-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-blue-700 dark:text-blue-400">
                    If fields are left blank, it will automatically use your server environment keys or default to local storage.
                  </p>
                </div>
              )}

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-amber-500 hover:bg-amber-50/20 transition-all dark:border-slate-700 dark:bg-slate-800/40"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {selectedFile ? selectedFile.name : 'Click to browse or drag & drop bottle image'}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Supported formats: JPG, PNG, WebP (up to 8MB)
                </p>
              </div>
            </div>
          )}

          {/* Mode 3: Preset Picker */}
          {activeMode === 'preset' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select from Curated Artisan Photography:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Aurra Sparkle Cranberry', path: '/assets/images/bev_cranberry_sparkle_1793439801856.jpg' },
                  { label: 'Aurra Mint Mojito', path: '/assets/images/bev_mint_mojito_1793439802738.jpg' },
                  { label: 'Aurra Zesty Lime', path: '/assets/images/bev_zesty_lime_1793439823884.jpg' },
                  { label: 'Aurra Mango Rush', path: '/assets/images/bev_mango_rush_1793439803204.jpg' },
                  { label: 'Aurra Fizz Orange', path: '/assets/images/bev_orange_fizz_1793439826689.jpg' },
                  { label: 'Aurra Peach Iced Tea', path: '/assets/images/bev_peach_iced_tea_1793439826681.jpg' },
                  { label: 'Aurra Passionfruit', path: '/assets/images/bev_passionfruit_fizz_1793441269499.jpg' },
                  { label: 'Flagship Can', path: '/assets/images/hero_beverage_can_1793439801479.jpg' },
                  { label: 'Aurra Berry Blast', path: '/assets/aistudio/aurra_berry_blast.jpg' },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setPreviewUrl(item.path);
                    }}
                    className={`relative overflow-hidden rounded-xl border p-1 text-left transition-all ${
                      previewUrl === item.path
                        ? 'border-amber-500 ring-2 ring-amber-400/50'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="aspect-4/3 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      <img src={item.path} alt={item.label} className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mode 4: Direct URL */}
          {activeMode === 'url' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Public Image URL:
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://res.cloudinary.com/your-cloud/image/upload/beverage.jpg"
                  value={directUrl}
                  onChange={(e) => {
                    setDirectUrl(e.target.value);
                    setPreviewUrl(e.target.value);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-xs text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Live Preview Container (Actual Shop Card Aspect 4:3) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-2">
              Live Storefront Preview (4:3 Card Format)
            </span>
            <div className="flex items-center gap-4">
              <div className="relative aspect-4/3 w-36 overflow-hidden rounded-xl border border-slate-200 bg-slate-200 dark:border-slate-700 dark:bg-slate-800 shrink-0">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-medium text-white">
                  {product.volume}
                </div>
              </div>

              <div className="text-xs space-y-1 text-slate-600 dark:text-slate-300">
                <div className="font-bold text-slate-900 dark:text-white">{product.name}</div>
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">{product.flavor}</div>
                <div className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  Price: ₹{product.price}
                </div>
                <div className="text-[10px] text-slate-400">
                  Target: <code>products.image_url</code> in SQLite DB
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSaveAndAssociate}
            disabled={loading || !previewUrl}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-600 transition-colors active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading & Storing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Apply to Beverage & Store</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
