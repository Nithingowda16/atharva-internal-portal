'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  Menu,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  X,
} from 'lucide-react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function Navbar({ title, subtitle, onRefresh }: NavbarProps) {
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
      <header className="h-16 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E5EA] px-3.5 sm:px-6 flex items-center justify-between sticky top-0 z-20 transition-all select-none w-full">
        {/* Left side: Hamburger (Mobile) + Desktop Sidebar Toggle + Title/Branding */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 truncate">
          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={toggleMobile}
            aria-label="Open navigation menu"
            aria-expanded={isMobileOpen}
            aria-controls="mobile-navigation-drawer"
            className="p-2 -ml-1 rounded-xl text-[#1D1D1F] hover:bg-[#F2F2F7] active:scale-95 transition-all focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] md:hidden shrink-0"
          >
            <Menu className="w-5 h-5 text-[#1D1D1F]" />
          </button>

          {/* Mobile Branding (Small screens only) */}
          <div className="flex items-center space-x-2 md:hidden shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#FFFFFF] border border-[#E5E5EA] p-0.5 flex items-center justify-center shrink-0">
              <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xs text-[#1D1D1F] tracking-tight hidden xs:inline truncate">
              ATHARVA
            </span>
          </div>

          <div className="h-4 w-px bg-[#E5E5EA] md:hidden hidden xs:block shrink-0" />

          {/* Desktop Sidebar Toggle Button */}
          <button
            type="button"
            onClick={toggleDesktopCollapse}
            aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden md:inline-flex p-1.5 -ml-1 mr-1 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] shrink-0"
          >
            {isDesktopCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#1D1D1F]" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-[#86868B]" />
            )}
          </button>

          {/* Page Title & Subtitle */}
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-semibold text-[#1D1D1F] tracking-tight truncate">
              {title || 'Finance Portal'}
            </h2>
            {subtitle && (
              <p className="text-[10px] sm:text-[11px] text-[#86868B] truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Live Status, Refresh, User Profile & Log Out */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Live Status Indicator */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-[10px] sm:text-[11px] font-semibold"
            title="Neon PostgreSQL Database: Connected & Live"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse shrink-0" />
            <span className="hidden xs:inline">Live</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 sm:p-2 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
              title="Refresh Financial Data"
              aria-label="Refresh Financial Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* User Profile & Sign Out Button */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 pl-1 sm:pl-2 border-l border-[#E5E5EA]">
            {/* User Profile Pill */}
            <div
              className="flex items-center space-x-2 py-1 px-2.5 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] text-xs"
              title={`${user?.name || 'Authorized User'} (${user?.role?.replace('_', ' ') || 'Staff'})`}
            >
              <div className="w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                {user?.name ? user.name[0] : 'B'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-[#1D1D1F] text-xs leading-tight truncate max-w-[120px]">
                  {user?.name || 'Bhaskar Vaidya'}
                </p>
                <p className="text-[10px] text-[#86868B] leading-none capitalize">
                  {user?.role ? user.role.toLowerCase().replace('_', ' ') : 'Super Admin'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              aria-label="Sign Out"
              title="Sign Out"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#FFFFFF] hover:bg-[#FEECEB] border border-[#E5E5EA] hover:border-[#FCD3D1] text-[#86868B] hover:text-[#FF3B30] text-xs font-medium transition-all active:scale-95 shadow-2xs shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#FF3B30] shrink-0" />
              <span className="hidden xs:inline">Log Out</span>
            </button>
          </div>
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
                Are you sure you want to log out of the ATHARVA TRAVELS Finance Portal, <strong className="text-[#1D1D1F]">{user?.name || 'Bhaskar Vaidya'}</strong>?
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
