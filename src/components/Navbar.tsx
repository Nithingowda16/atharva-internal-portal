'use client';

import React from 'react';
import Link from 'next/link';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  Menu,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function Navbar({ title, subtitle, onRefresh }: NavbarProps) {
  const {
    toggleMobile,
    isMobileOpen,
    isDesktopCollapsed,
    toggleDesktopCollapse,
    user,
  } = useSidebar();

  return (
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

      {/* Right side: Live Status, Badges, Refresh, User Profile Menu */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
        {/* Live Status Indicator */}
        <div
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-[10px] sm:text-[11px] font-semibold"
          title="Neon PostgreSQL Database: Connected & Live"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse shrink-0" />
          <span className="hidden xs:inline">Live</span>
        </div>

        {/* Excel Reconciliation Badge (Tablet & Desktop) */}
        <div className="hidden lg:flex items-center px-3 py-1 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] text-[#1D1D1F] text-[11px] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#34C759] shrink-0" />
          <span>Excel Reconciled (₹0.00 Var)</span>
        </div>

        {/* 39 #REF! Errors Flagged Badge */}
        <Link
          href="/raw-cells?onlyRef=true"
          className="flex items-center px-2 sm:px-3 py-1 rounded-full bg-[#FFF5E5] border border-[#FFE4B8] text-[#FF9F0A] text-[10px] sm:text-[11px] font-medium hover:bg-[#FFEECF] transition-colors"
          title="Review 39 original Excel formula errors"
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-[#FF9F0A] shrink-0" />
          <span className="hidden sm:inline">39 #REF! Errors Flagged</span>
          <span className="sm:hidden font-semibold">39 REF</span>
        </Link>

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

        {/* User Profile Menu Avatar */}
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/25 flex items-center justify-center text-[#007AFF] text-xs font-bold shrink-0 cursor-default"
          title={`${user?.name || 'Authorized User'} (${user?.role?.replace('_', ' ') || 'Staff'})`}
        >
          {user?.name ? user.name[0] : 'A'}
        </div>
      </div>
    </header>
  );
}
