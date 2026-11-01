import React, { useState, useRef } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  Camera,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  CreditCard,
  Network,
  Sparkles,
  KeyRound,
  MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile, changePassword, updateAvatar, updateAddress } = useAuth();

  // Active section inside Settings: 'profile' | 'security'
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Name edit state
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Delivery Address edit state
  const [addressInput, setAddressInput] = useState(user?.delivery_address || '');
  const [updatingAddress, setUpdatingAddress] = useState(false);
  const [addressSuccess, setAddressSuccess] = useState(false);

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Copy helper
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || nameInput.trim() === user.name) return;
    setUpdatingName(true);
    setNameSuccess(false);
    try {
      await updateProfile(nameInput.trim());
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdatingName(false);
    }
  };

  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim() || addressInput.trim() === user.delivery_address) return;
    setUpdatingAddress(true);
    setAddressSuccess(false);
    try {
      await updateAddress(addressInput.trim());
      setAddressSuccess(true);
      setTimeout(() => setAddressSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUpdatingAddress(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setUploadingAvatar(true);
      setAvatarSuccess(false);
      try {
        await updateAvatar(base64);
        setAvatarSuccess(true);
        setTimeout(() => setAvatarSuccess(false), 3000);
      } catch (err: any) {
        alert(err.message || 'Failed to update avatar photo');
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Formatted registration date
  const memberSinceFormatted = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Oct 2026';

  const memberId = user.id.startsWith('usr_') || user.id.startsWith('id_')
    ? user.id
    : `AURRA-MEM-${user.id.slice(0, 8).toUpperCase()}`;

  const parentId = user.parent_id || 'AURRA-DIST-IND-01';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl transition-all dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
              <UserIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Account Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Membership details, security &amp; profile preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="mt-4 flex gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <UserIcon className="h-3.5 w-3.5" />
            <span>Member Profile &amp; ID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Security &amp; Password</span>
          </button>
        </div>

        {/* TAB 1: Profile & Membership info */}
        {activeTab === 'profile' && (
          <div className="mt-5 space-y-6">
            {/* Avatar & Photo Upload */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="relative group">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-amber-400 shadow-md ring-2 ring-white dark:ring-slate-800"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 text-white text-xl font-black uppercase shadow-md ring-2 ring-white dark:ring-slate-800">
                    {user.name?.charAt(0) || 'A'}
                  </div>
                )}
                
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload profile photo"
                  className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-md hover:bg-amber-500 transition-colors cursor-pointer"
                >
                  {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</h4>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50">
                    Verified Member
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 text-[11px] font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline cursor-pointer"
                >
                  {user.avatar_url ? 'Change profile photo' : 'Upload photo'}
                </button>

                {avatarSuccess && (
                  <span className="ml-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    Photo updated!
                  </span>
                )}
              </div>
            </div>

            {/* Display Name Edit Field */}
            <form onSubmit={handleUpdateName} className="space-y-1.5">
              <label htmlFor="settings-name-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Display Name
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button
                  type="submit"
                  disabled={updatingName || nameInput.trim() === user.name}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
                >
                  {updatingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Name'}
                </button>
              </div>
              {nameSuccess && (
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Display name updated.</span>
                </p>
              )}
            </form>

            {/* Delivery Address Field */}
            <form onSubmit={handleUpdateAddress} className="space-y-1.5">
              <label htmlFor="settings-address-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span>Delivery Address</span>
              </label>
              <div className="flex gap-2">
                <textarea
                  id="settings-address-input"
                  rows={2}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter house/flat no., street, area, city & PIN code"
                  className="flex-1 rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
                <button
                  type="submit"
                  disabled={updatingAddress || !addressInput.trim() || addressInput.trim() === user.delivery_address}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors shrink-0 self-end cursor-pointer"
                >
                  {updatingAddress ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Address'}
                </button>
              </div>
              {addressSuccess && (
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Delivery address updated successfully.</span>
                </p>
              )}
            </form>

            {/* The 5 Key Information Fields */}
            <div className="space-y-3 rounded-2xl bg-slate-50/80 p-4 text-xs dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              {/* 1. Member ID */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                  Member ID
                </span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                  <span>{memberId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(memberId, 'memberId')}
                    title="Copy Member ID"
                    className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {copiedField === 'memberId' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* 2. Member Since */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Member Since
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {memberSinceFormatted}
                </span>
              </div>

              {/* 3. Default Payment */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                  Default Payment
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>UPI &amp; Instant QR</span>
                  <span className="rounded bg-emerald-500/10 px-1 py-0.2 text-[9px] font-black text-emerald-600">
                    ACTIVE
                  </span>
                </span>
              </div>

              {/* 4. Parent ID */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Network className="h-3.5 w-3.5 text-amber-500" />
                  Parent ID
                </span>
                <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                  <span>{parentId}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(parentId, 'parentId')}
                    title="Copy Parent ID"
                    className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {copiedField === 'parentId' ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              {/* 5. Verified Member / Club Member Status */}
              <div className="flex items-center justify-between pt-0.5">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Membership Tier
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-400/30">
                    Verified Member
                  </span>
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-400/30">
                    Aurra Club Member
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Change Password & Security */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="mt-5 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-amber-500" />
                Change Account Password
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ensure your password is at least 8 characters long for account security.
              </p>
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                <Check className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Password changed successfully! Keep it safe.</span>
              </div>
            )}

            <div>
              <label htmlFor="settings-current-pwd" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Current Password
              </label>
              <input
                id="settings-current-pwd"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label htmlFor="settings-new-pwd" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                New Password (min. 8 characters)
              </label>
              <input
                id="settings-new-pwd"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div>
              <label htmlFor="settings-confirm-pwd" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Confirm New Password
              </label>
              <input
                id="settings-confirm-pwd"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 px-4 text-xs font-bold text-white shadow-md hover:bg-amber-600 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {changingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer info notice */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Aurra Clean Energy Security</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
