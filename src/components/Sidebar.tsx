'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  Calendar,
  Truck,
  CarFront,
  Building2,
  Receipt,
  Scissors,
  CreditCard,
  FileBarChart2,
  FileSpreadsheet,
  History,
  Trash2,
  Users,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  user?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function Sidebar({ user: propUser }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    isMobileOpen,
    closeMobile,
    isDesktopCollapsed,
    toggleDesktopCollapse,
    user: contextUser,
  } = useSidebar();

  const user = propUser || contextUser;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      closeMobile();
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Monthly Finance', href: '/monthly-finance', icon: Calendar, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Billing & Transactions', href: '/billing', icon: Receipt, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Adjustments & Deductions', href: '/adjustments', icon: Scissors, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Payments & Settlements', href: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Fleet Management', href: '/fleet', icon: Truck, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Vehicle Management', href: '/vehicles', icon: CarFront, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Company Management', href: '/companies', icon: Building2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', href: '/reports', icon: FileBarChart2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
        { label: 'Excel Imports & Archive', href: '/raw-cells', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Audit History', href: '/audit', icon: History, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
        { label: 'Recycle Bin', href: '/recycle-bin', icon: Trash2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER'] },
        { label: 'User Management', href: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  return (
    <>
      {/* =========================================================================
          1. DESKTOP & TABLET SIDEBAR (Permanently mounted on md: and above)
          - Expanded: ~260px width
          - Collapsed: ~76px width
          - Smooth 250ms CSS width transition
          ========================================================================= */}
      <aside
        aria-label="Desktop Navigation"
        className={`hidden md:flex flex-col h-screen fixed left-0 top-0 z-30 select-none bg-[#FFFFFF] border-r border-[#E5E5EA] shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-[width] duration-250 ease-in-out ${
          isDesktopCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Brand Header & Collapse Toggle */}
        <div
          className={`h-16 border-b border-[#E5E5EA] flex items-center bg-[#FFFFFF] shrink-0 ${
            isDesktopCollapsed ? 'justify-center px-2' : 'justify-between px-4'
          }`}
        >
          {/* Logo & Text when expanded */}
          {!isDesktopCollapsed ? (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E5E5EA] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
                <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
              </div>
              <div className="leading-tight truncate">
                <h1 className="font-bold text-[#1D1D1F] text-[13px] tracking-tight truncate">
                  ATHARVA TRAVELS
                </h1>
                <p className="text-[10px] text-[#86868B] font-medium truncate">Finance Portal</p>
              </div>
            </div>
          ) : (
            /* Icon emblem when collapsed */
            <div
              className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E5E5EA] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden cursor-pointer"
              onClick={toggleDesktopCollapse}
              title="Click to expand sidebar"
            >
              <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
            </div>
          )}

          {/* Toggle Button */}
          <button
            type="button"
            onClick={toggleDesktopCollapse}
            aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`p-1.5 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] ${
              isDesktopCollapsed ? 'hidden' : 'block shrink-0'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsed Mode Expand Pill (when in 76px mode) */}
        {isDesktopCollapsed && (
          <div className="pt-2 pb-1 px-2 flex justify-center">
            <button
              type="button"
              onClick={toggleDesktopCollapse}
              aria-label="Expand sidebar"
              title="Expand sidebar (Desktop)"
              className="w-10 h-7 rounded-lg bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Sections */}
        <nav
          className={`flex-1 overflow-y-auto py-3 space-y-4 custom-scrollbar ${
            isDesktopCollapsed ? 'px-2' : 'px-3'
          }`}
        >
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !user || item.roles.includes(user.role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {/* Section title (only when expanded) */}
                {!isDesktopCollapsed && (
                  <p className="px-3 text-[10px] font-semibold tracking-wider text-[#86868B] uppercase">
                    {group.title}
                  </p>
                )}

                {/* Items */}
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  if (isDesktopCollapsed) {
                    // Collapsed mode: Centered icon with tooltip
                    return (
                      <div key={item.href} className="relative group flex justify-center">
                        <Link
                          href={item.href}
                          aria-label={item.label}
                          className={`w-11 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                            isActive
                              ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                              : 'text-[#48484A] hover:bg-[#F2F2F7] hover:text-[#1D1D1F]'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#86868B]'}`} />
                        </Link>

                        {/* Floating Tooltip */}
                        <div
                          role="tooltip"
                          className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#1D1D1F] text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap z-50 transition-opacity duration-150"
                        >
                          {item.label}
                        </div>
                      </div>
                    );
                  }

                  // Expanded mode: Full item with icon and label
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                          : 'text-[#1D1D1F] hover:bg-[#F2F2F7] text-[#48484A]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-[#86868B]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className={`border-t border-[#E5E5EA] bg-[#FBFBFC] ${isDesktopCollapsed ? 'p-2' : 'p-3'}`}>
          {!isDesktopCollapsed ? (
            /* Expanded Footer */
            <div className="flex items-center justify-between p-2 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs">
              <div className="flex items-center space-x-2.5 truncate">
                <div className="w-8 h-8 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] flex items-center justify-center text-[#007AFF] text-xs font-semibold shrink-0">
                  {user?.name ? user.name[0] : 'A'}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-[#1D1D1F] truncate">{user?.name || 'Authorized User'}</p>
                  <p className="text-[10px] text-[#86868B] truncate font-medium">{user?.role?.replace('_', ' ') || 'Finance'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Collapsed Footer */
            <div className="flex flex-col items-center space-y-2 py-1">
              <div
                className="w-9 h-9 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] flex items-center justify-center text-[#007AFF] text-xs font-semibold cursor-default"
                title={`${user?.name || 'User'} (${user?.role?.replace('_', ' ') || 'Finance'})`}
              >
                {user?.name ? user.name[0] : 'A'}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-2 rounded-xl text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. MOBILE OFF-CANVAS SLIDING DRAWER (Below 768px: md:hidden)
          - Hidden by default (-translate-x-full)
          - Slides smoothly in from left on hamburger click (250ms)
          - Semi-transparent backdrop overlay with blur
          - Closes on: close button, click outside, link navigation, Escape key
          ========================================================================= */}
      {/* Semi-transparent background overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity duration-250 ease-in-out ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Off-canvas sliding drawer */}
      <aside
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
        className={`fixed inset-y-0 left-0 w-[280px] max-w-[85vw] bg-[#FFFFFF] z-50 md:hidden shadow-2xl flex flex-col transform transition-transform duration-250 ease-in-out select-none border-r border-[#E5E5EA] ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
      >
        {/* Mobile Drawer Header */}
        <div className="h-16 px-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#FFFFFF] shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#FFFFFF] border border-[#E5E5EA] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
              <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
            </div>
            <div className="leading-tight truncate">
              <h2 className="font-bold text-[#1D1D1F] text-[13px] tracking-tight truncate">
                ATHARVA TRAVELS
              </h2>
              <p className="text-[10px] text-[#86868B] font-medium truncate">Finance Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="p-2 rounded-xl text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#007AFF]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Navigation List */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !user || item.roles.includes(user.role)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <p className="px-3 text-[10px] font-semibold tracking-wider text-[#86868B] uppercase">
                  {group.title}
                </p>
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                          : 'text-[#1D1D1F] hover:bg-[#F2F2F7] text-[#48484A]'
                      }`}
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-white' : 'text-[#86868B]'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80 shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Mobile User Profile Footer */}
        <div className="p-3 border-t border-[#E5E5EA] bg-[#FBFBFC] shrink-0">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs">
            <div className="flex items-center space-x-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] flex items-center justify-center text-[#007AFF] text-xs font-semibold shrink-0">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-[#1D1D1F] truncate">{user?.name || 'Authorized User'}</p>
                <p className="text-[10px] text-[#86868B] truncate font-medium">{user?.role?.replace('_', ' ') || 'Finance'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
