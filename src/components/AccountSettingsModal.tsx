'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Camera,
  Trash2,
  Upload,
  Sun,
  Moon,
  Monitor,
  Check,
  Shield,
  Key,
  Clock,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTheme, Theme } from '@/contexts/ThemeContext';

interface AccountSettingsModalProps {
  isOpen: boolean;
  user: {
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
  } | null;
  onClose: () => void;
  onLogoutClick: () => void;
}

export default function AccountSettingsModal({
  isOpen,
  user,
  onClose,
  onLogoutClick,
}: AccountSettingsModalProps) {
  const { theme, setTheme, avatarUrl, setAvatarUrl } = useTheme();
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'security'>('profile');
  const [savedNotification, setSavedNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('Profile picture size should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        setSavedNotification('Profile picture updated successfully!');
        setTimeout(() => setSavedNotification(null), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl(null);
    setSavedNotification('Profile picture removed (reverted to default initial).');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  const userName = user?.name || 'Bhaskar Vaidya';
  const userEmail = user?.email || 'bhaskar@atharvatravels.in';
  const userRole = user?.role ? user.role.replace('_', ' ') : 'Super Admin';
  const initial = userName ? userName[0].toUpperCase() : 'B';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] max-w-lg w-full shadow-apple-modal overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5EA] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1D1D1F]">Account Settings</h3>
              <p className="text-[11px] text-[#86868B]">Profile, Theme Appearance & Preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E5E5EA] px-6 pt-2 bg-[#FBFBFC] gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#007AFF] text-[#007AFF]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Profile Photo & Info
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'appearance'
                ? 'border-[#007AFF] text-[#007AFF]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Theme & Appearance
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#007AFF] text-[#007AFF]'
                : 'border-transparent text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            Session & Security
          </button>
        </div>

        {/* Saved Notification */}
        {savedNotification && (
          <div className="mx-6 mt-3 p-2.5 rounded-xl bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-xs font-medium flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedNotification}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: PROFILE PHOTO & INFO */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {/* Profile Image Management Card */}
              <div className="p-4 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-3xl font-bold shadow-md">
                      {initial}
                    </div>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    title="Change profile picture"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <h4 className="font-bold text-sm text-[#1D1D1F]">{userName}</h4>
                  <p className="text-xs text-[#86868B]">{userEmail}</p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-full bg-[#007AFF] hover:bg-[#0062CC] text-white text-[11px] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#FEECEB] border border-[#E5E5EA] text-[#FF3B30] text-[11px] font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Details Form */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    disabled
                    value={userName}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-xs font-semibold text-[#1D1D1F] cursor-not-allowed opacity-90"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={userEmail}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-xs font-mono text-[#1D1D1F] cursor-not-allowed opacity-90"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#86868B] mb-1">
                    Portal Authority Role
                  </label>
                  <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-[#EAF9EE] border border-[#D2F4DA] text-xs font-semibold text-[#34C759]">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{userRole} (Authorized Signatory)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APPEARANCE & THEME SELECTION */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-[#1D1D1F]">Interface Theme Selection</h4>
                <p className="text-[11px] text-[#86868B]">
                  Choose how Atharva Travels Finance Portal appears on your screen
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Light Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    setSavedNotification('Switched to Light mode.');
                    setTimeout(() => setSavedNotification(null), 3000);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-[#007AFF]/10 border-[#007AFF] shadow-sm ring-2 ring-[#007AFF]/30'
                      : 'bg-[#FFFFFF] border-[#E5E5EA] hover:border-[#86868B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-[#FF9F0A]/10 text-[#FF9F0A] flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    {theme === 'light' && (
                      <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1D1D1F]">Light</p>
                    <p className="text-[10px] text-[#86868B]">Crisp Apple white palette</p>
                  </div>
                </button>

                {/* 2. Dark Mode */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    setSavedNotification('Switched to Dark mode.');
                    setTimeout(() => setSavedNotification(null), 3000);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                    theme === 'dark'
                      ? 'bg-[#007AFF]/10 border-[#007AFF] shadow-sm ring-2 ring-[#007AFF]/30'
                      : 'bg-[#FFFFFF] border-[#E5E5EA] hover:border-[#86868B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    {theme === 'dark' && (
                      <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1D1D1F]">Dark</p>
                    <p className="text-[10px] text-[#86868B]">Deep Pro slate & contrast</p>
                  </div>
                </button>

                {/* 3. System Default */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme('system');
                    setSavedNotification('Theme set to follow System Default.');
                    setTimeout(() => setSavedNotification(null), 3000);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between space-y-3 transition-all cursor-pointer ${
                    theme === 'system'
                      ? 'bg-[#007AFF]/10 border-[#007AFF] shadow-sm ring-2 ring-[#007AFF]/30'
                      : 'bg-[#FFFFFF] border-[#E5E5EA] hover:border-[#86868B]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-full bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                      <Monitor className="w-4 h-4" />
                    </div>
                    {theme === 'system' && (
                      <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-[#1D1D1F]">System Default</p>
                    <p className="text-[10px] text-[#86868B]">Follows OS auto-theme</p>
                  </div>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] text-xs text-[#48484A] space-y-1">
                <p className="font-semibold text-[#1D1D1F] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Persistent Preference</span>
                </p>
                <p className="text-[11px] text-[#86868B]">
                  Your theme selection is saved securely and applies seamlessly across all financial modules, tables, and views.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SESSION & SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-[#F2F2F7] border border-[#E5E5EA] space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-[#E5E5EA]">
                  <span className="text-[#86868B]">Account Status:</span>
                  <span className="font-bold text-[#34C759] flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-[#34C759] inline-block" />
                    <span>Active & Verified</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-[#E5E5EA]">
                  <span className="text-[#86868B]">Access Authority:</span>
                  <span className="font-bold text-[#1D1D1F]">{userRole}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#86868B]">Database Connection:</span>
                  <span className="font-semibold text-[#007AFF]">Neon PostgreSQL (Live SSL)</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FEECEB] border border-[#FCD3D1] space-y-2">
                <h5 className="font-bold text-xs text-[#FF3B30] flex items-center space-x-1.5">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Session Termination</span>
                </h5>
                <p className="text-[11px] text-[#86868B]">
                  End your current authenticated session on this browser. You will need your password to sign in again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLogoutClick();
                  }}
                  className="px-4 py-2 rounded-full bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold transition-all shadow-apple-btn active:scale-95 cursor-pointer"
                >
                  Log Out of Session
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FBFBFC] border-t border-[#E5E5EA] flex items-center justify-between">
          <span className="text-[11px] text-[#86868B]">
            Atharva Travels Internal Portal • v2.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white text-xs font-semibold transition-all shadow-2xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

