'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import GlobalSearch from '@/components/GlobalSearch';
import PageHeader from '@/components/PageHeader';
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
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
    isMobileOpen,
    isDesktopCollapsed,
    toggleDesktopCollapse,
    user,
  } = useSidebar();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLogoutConfirm]);

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

  return (
    <>
      {/* Top Header Bar – Full width edge-to-edge above the entire app, Google Skills style */}
      <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E5EA] px-3 sm:px-6 flex items-center justify-between sticky top-0 z-40 transition-all select-none w-full shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        {/* Left side: Hamburger Toggle + Brand Logo & Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={toggleMobile}
            aria-label="Open navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation-drawer"
            className="p-2 -ml-1 rounded-xl text-[#1D1D1F] hover:bg-[#F2F2F7] active:scale-95 transition-all focus:outline-hidden md:hidden shrink-0 cursor-pointer"
          >
            <Menu className="w-5 h-5 text-[#1D1D1F]" />
          </button>

          {/* Desktop Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleDesktopCollapse}
            aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:inline-flex p-1.5 -ml-1 mr-1 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] shrink-0 cursor-pointer"
          >
            {isDesktopCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#1D1D1F]" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-[#86868B]" />
            )}
          </button>

          {/* Brand Logo & Name (visible on desktop and mobile, Google Skills style) */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-[#FFFFFF] border border-[#E5E5EA] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight hidden xs:block">
              <h1 className="font-bold text-[#1D1D1F] text-xs sm:text-[13px] tracking-tight truncate">
                ATHARVA TRAVELS
              </h1>
              <p className="text-[10px] text-[#86868B] font-medium truncate">Finance Portal</p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar – Above in the center (Google Skills style) */}
        <div className="flex-1 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-2 sm:mx-6">
          <GlobalSearch />
        </div>

        {/* Right side: Live Status, User Profile & Log Out – In the SAME row! */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Live Status Indicator */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-[10px] sm:text-[11px] font-semibold"
            title="Neon PostgreSQL Database: Connected & Live"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse shrink-0" />
            <span className="hidden sm:inline">Live</span>
          </div>

          {/* User Profile Pill */}
          <div
            className="flex items-center space-x-2 py-1 px-2 sm:px-2.5 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] text-xs"
            title={`${user?.name || 'Authorized User'} (${user?.role?.replace('_', ' ') || 'Staff'})`}
          >
            <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
              {user?.name ? user.name[0] : 'B'}
            </div>
            <div className="hidden md:block text-left">
              <p className="font-semibold text-[#1D1D1F] text-xs leading-tight truncate max-w-[120px]">
                {user?.name || 'Bhaskar Vaidya'}
              </p>
              <p className="text-[10px] text-[#86868B] leading-none capitalize">
                {user?.role ? user.role.toLowerCase().replace('_', ' ') : 'Super Admin'}
              </p>
            </div>
          </div>

          {/* Logout Button in the same row! */}
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
                Are you sure you want to log out of the ATHARVA TRAVELS Finance Portal, <strong className="text-[#1D1D1F]">{user?.name || 'Authorized User'}</strong>?
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
