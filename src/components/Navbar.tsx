'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import { useTheme } from '@/contexts/ThemeContext';
import GlobalSearch from '@/components/GlobalSearch';
import PageHeader from '@/components/PageHeader';
import AccountSettingsModal from '@/components/AccountSettingsModal';
import {
  Menu,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  Settings,
  Shield,
  User as UserIcon,
  Check
} from 'lucide-react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function Navbar({ title, subtitle, onRefresh }: NavbarProps) {
  // If title or subtitle is passed (i.e. called from inside a page), render PageHeader banner
  if (title || subtitle) {
    return <PageHeader title={title || ''} subtitle={subtitle} onRefresh={onRefresh} />;
  }

  const router = useRouter();
  const {
    toggleMobile,
    isDesktopCollapsed,
    toggleDesktopCollapse,
    user,
  } = useSidebar();

  const { theme, setTheme, avatarUrl } = useTheme();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

  // Close modal or profile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoutConfirm) setShowLogoutConfirm(false);
        if (isProfileMenuOpen) setIsProfileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm, isProfileMenuOpen]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setShowLogoutConfirm(false);
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
      setIsLoggingOut(false);
    }
  };

  const displayName = user?.name || 'Bhaskar Vaidya';
  const displayRole = user?.role ? user.role.toLowerCase().replace('_', ' ') : 'Super Admin';
  const initial = displayName ? displayName[0].toUpperCase() : 'B';

  return (
    <>
      {/* Top Header Bar – Full width edge-to-edge above the entire app, Google Skills style */}
      <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E5EA] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-all select-none w-full shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Left side: Navigation Toggle Button + Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                toggleMobile();
              } else {
                toggleDesktopCollapse();
              }
            }}
            aria-label="Toggle navigation"
            title={isDesktopCollapsed ? 'Expand sidebar' : 'Close sidebar'}
            className="p-2 -ml-1 rounded-xl text-[#1D1D1F] hover:bg-[#F2F2F7] active:scale-95 transition-all focus:outline-hidden cursor-pointer shrink-0"
          >
            <Menu className="w-5 h-5 text-[#1D1D1F]" />
          </button>

          {/* Official Atharva Travels Logo */}
          <div className="flex items-center shrink-0">
            <img
              src="/atharva-logo-transparent.png"
              alt="Atharva Travels - Let's Drive Together"
              className="h-10 sm:h-12 w-auto object-contain bg-transparent shrink-0"
            />
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-2 sm:mx-6">
          <GlobalSearch />
        </div>

        {/* Right side: Live Status, User Profile Pill & Quick Log Out */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Live Status Indicator */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-[10px] sm:text-[11px] font-semibold"
            title="Neon PostgreSQL Database: Connected & Live"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse shrink-0" />
            <span className="hidden sm:inline">Live</span>
          </div>

          {/* Interactive User Profile Pill with Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-label="User account and settings"
              className="flex items-center space-x-2 py-1 px-2 sm:px-2.5 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-xs transition-colors cursor-pointer active:scale-95"
            >
              {/* Profile Image / Initial Avatar */}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-6 h-6 rounded-full object-cover border border-white shadow-xs shrink-0"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                  {initial}
                </div>
              )}

              <div className="hidden md:block text-left">
                <p className="font-semibold text-[#1D1D1F] text-xs leading-tight truncate max-w-[120px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-[#86868B] leading-none capitalize">
                  {displayRole}
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-[#86868B] transition-transform duration-200 ${
                  isProfileMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Profile Dropdown Popover Menu */}
            {isProfileMenuOpen && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileMenuOpen(false)}
                />

                <div className="absolute right-0 mt-2 w-72 bg-[#FFFFFF] rounded-[22px] shadow-apple-modal border border-[#E5E5EA] p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Profile Card */}
                  <div className="flex items-center space-x-3 p-2 bg-[#F8F9FA] rounded-2xl border border-[#E5E5EA]">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-base font-bold shadow-xs shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs text-[#1D1D1F] truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-[#86868B] truncate">
                        {user?.email || 'bhaskar@atharvatravels.in'}
                      </p>
                      <span className="inline-flex items-center space-x-1 mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EAF9EE] text-[#34C759] border border-[#D2F4DA] uppercase">
                        <Shield className="w-2.5 h-2.5" />
                        <span>{user?.role ? user.role.replace('_', ' ') : 'SUPER ADMIN'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Theme Switcher Segmented Control */}
                  <div className="mt-3 px-1 py-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#86868B] mb-1.5 px-1">
                      Theme Selection
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-[#F2F2F7] p-1 rounded-xl border border-[#E5E5EA]">
                      <button
                        type="button"
                        onClick={() => setTheme('light')}
                        className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          theme === 'light'
                            ? 'bg-[#FFFFFF] text-[#007AFF] shadow-xs'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                        }`}
                        title="Light Theme"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('dark')}
                        className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          theme === 'dark'
                            ? 'bg-[#FFFFFF] text-[#007AFF] shadow-xs'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                        }`}
                        title="Dark Theme"
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTheme('system')}
                        className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                          theme === 'system'
                            ? 'bg-[#FFFFFF] text-[#007AFF] shadow-xs'
                            : 'text-[#86868B] hover:text-[#1D1D1F]'
                        }`}
                        title="System Default Theme"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                        <span>System</span>
                      </button>
                    </div>
                  </div>

                  {/* Account Settings Option */}
                  <div className="mt-2 border-t border-[#E5E5EA] pt-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsAccountSettingsOpen(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#1D1D1F] hover:bg-[#F2F2F7] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        <Settings className="w-4 h-4 text-[#007AFF]" />
                        <span>Account Settings</span>
                      </div>
                      <span className="text-[10px] text-[#86868B]">Profile, Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setShowLogoutConfirm(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#FF3B30] hover:bg-[#FEECEB] flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-[#FF3B30]" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Logout Button (in the same row, kept as requested) */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            aria-label="Sign Out"
            title="Sign Out"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#FEECEB] border border-[#E5E5EA] hover:border-[#FCD3D1] text-[#86868B] hover:text-[#FF3B30] text-xs font-semibold transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#FF3B30] shrink-0" />
            <span className="hidden sm:inline">Log Out</span>
          </button>
        </div>
      </header>

      {/* Account Settings Modal */}
      {isAccountSettingsOpen && (
        <AccountSettingsModal
          isOpen={isAccountSettingsOpen}
          user={user}
          onClose={() => setIsAccountSettingsOpen(false)}
          onLogoutClick={() => setShowLogoutConfirm(true)}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-[#FFFFFF] border border-[#E5E5EA] rounded-[24px] p-6 max-w-sm w-full shadow-apple-card space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
          >
            <div className="w-12 h-12 rounded-full bg-[#FEECEB] border border-[#FCD3D1] flex items-center justify-center text-[#FF3B30] mx-auto">
              <LogOut className="w-5 h-5 text-[#FF3B30]" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 id="logout-dialog-title" className="text-base font-bold text-[#1D1D1F]">
                Sign Out Confirmation
              </h3>
              <p className="text-xs text-[#86868B] leading-relaxed">
                Are you sure you want to log out of the ATHARVA TRAVELS Finance Portal, <strong className="text-[#1D1D1F]">{displayName}</strong>?
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-full bg-[#FF3B30] hover:bg-[#D70015] text-white text-xs font-semibold shadow-apple-btn transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoggingOut ? 'Logging out...' : 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
