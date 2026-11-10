'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/contexts/SidebarContext';
import {
  LayoutDashboard,
  Landmark,
  ChevronDown,
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
  ChevronRight,
  ChevronLeft,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';


const BANK_SHEETS_SUB_NAV = [
  { label: 'Bank Balance', href: '/bank/bank-balance', isMain: true },
  { label: 'DCO', href: '/bank/dco' },
  { label: 'Profit Sharing', href: '/bank/profit-sharing' },
  { label: 'Pending Payment', href: '/bank/pending-payment' },
  { label: 'Harish GS', href: '/bank/harish-gs' },
  { label: 'Expense', href: '/bank/expense' },
  { label: 'SST', href: '/bank/sst' },
  { label: 'ECO Travels', href: '/bank/eco-travels' },
  { label: 'EURO-Amz', href: '/bank/euro-amz' },
  { label: 'O2', href: '/bank/o2' },
  { label: 'ORIX -Parexel', href: '/bank/orix-parexel' },
  { label: 'ANP-HCL', href: '/bank/anp-hcl' },
];

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
  const [isBankOpen, setIsBankOpen] = useState(pathname.startsWith('/bank'));
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname.startsWith('/bank') && !prevPathRef.current.startsWith('/bank')) {
      setIsBankOpen(true);
    }
    prevPathRef.current = pathname;
  }, [pathname]);
  const {
    isMobileOpen,
    closeMobile,
    isDesktopCollapsed,
    toggleDesktopCollapse,
    user: contextUser,
  } = useSidebar();

  const user = propUser || contextUser;

  const navGroups = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
      ],
    },
    {
      title: 'Finance',
      items: [
        { label: 'Monthly Finance', href: '/monthly-finance', icon: Calendar, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Bank & Accounts Management', href: '/bank', icon: Landmark, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'], hasSubItems: true },
        { label: 'Billing & Transactions', href: '/billing', icon: Receipt, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Adjustments & Deductions', href: '/adjustments', icon: Scissors, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Payments & Settlements', href: '/payments', icon: CreditCard, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Fleet Management', href: '/fleet', icon: Truck, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Vehicle Management', href: '/vehicles', icon: CarFront, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Company Management', href: '/companies', icon: Building2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'VIEWER'] },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Reports', href: '/reports', icon: FileBarChart2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
        { label: 'Excel Imports & Archive', href: '/raw-cells', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS', 'VIEWER'] },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Audit History', href: '/audit', icon: History, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'VIEWER'] },
        { label: 'Recycle Bin', href: '/recycle-bin', icon: Trash2, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'VIEWER'] },
        { label: 'User Management', href: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
      ],
    },
  ];

  return (
    <>
      {/* =========================================================================
          1. DESKTOP & TABLET SIDEBAR (Permanently mounted on md: and above)
          - Positioned directly below Top Navigation Bar (top-16)
          - Expanded: ~260px width
          - Collapsed: ~76px width
          - Smooth 250ms CSS width transition
          ========================================================================= */}
      <aside
        aria-label="Desktop Navigation"
        className={`hidden md:flex flex-col h-[calc(100vh-4rem)] fixed left-0 top-16 z-30 select-none bg-[#FFFFFF] border-r border-[#E5E5EA] shadow-[1px_0_10px_rgba(0,0,0,0.02)] transition-[width] duration-250 ease-in-out ${
          isDesktopCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {/* Sidebar Header: Compact Collapse / Expand bar */}
        <div
          className={`h-11 border-b border-[#E5E5EA] flex items-center bg-[#FFFFFF] shrink-0 px-3.5 ${
            isDesktopCollapsed ? 'justify-center px-1' : 'justify-between'
          }`}
        >
          {!isDesktopCollapsed && (
            <span className="text-[11px] font-bold text-[#86868B] tracking-wider uppercase">
              Navigation
            </span>
          )}
          <button
            type="button"
            onClick={toggleDesktopCollapse}
            aria-label={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isDesktopCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1 rounded-md text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] transition-colors focus:outline-hidden cursor-pointer"
          >
            {isDesktopCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
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

                  // Expanded mode: Sub-menu for Bank & Accounts Management
                  if ((item as any).hasSubItems) {
                    const isBankActive = pathname.startsWith('/bank');
                    return (
                      <div key={item.href} className="space-y-1">
                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                            isBankActive
                              ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                              : 'text-[#1D1D1F] hover:bg-[#F2F2F7] text-[#48484A]'
                          }`}
                        >
                          <Link
                            href={item.href}
                            onClick={() => setIsBankOpen(true)}
                            className="flex items-center space-x-2.5 truncate flex-1 focus:outline-hidden"
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isBankActive ? 'text-white' : 'text-[#86868B]'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsBankOpen((prev) => !prev);
                            }}
                            aria-label={isBankOpen ? 'Collapse Bank & Accounts submenu' : 'Expand Bank & Accounts submenu'}
                            title={isBankOpen ? 'Collapse submenu' : 'Expand submenu'}
                            className={`p-1 -mr-1 rounded-md transition-colors flex items-center justify-center focus:outline-hidden ${
                              isBankActive
                                ? 'hover:bg-white/20 active:bg-white/30 text-white'
                                : 'hover:bg-[#E5E5EA] active:bg-[#D1D1D6] text-[#86868B]'
                            }`}
                          >
                            {isBankOpen ? (
                              <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </button>
                        </div>

                        {isBankOpen && (
                          <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-[#007AFF]/20 ml-4 my-1">
                            {BANK_SHEETS_SUB_NAV.map((sub) => {
                              const isSubActive = pathname === sub.href || (sub.isMain && pathname === '/bank');
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                                    isSubActive
                                      ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold'
                                      : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
                                  }`}
                                >
                                  <span className="truncate">{sub.label}</span>
                                  {sub.isMain && (
                                    <span className="text-[9px] px-1 py-0.2 bg-[#34C759]/10 text-[#34C759] rounded font-bold">
                                      Main
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Normal expanded item
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
                  if ((item as any).hasSubItems) {
                    const isBankActive = pathname.startsWith('/bank');
                    return (
                      <div key={item.href} className="space-y-1">
                        <div
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                            isBankActive
                              ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                              : 'text-[#1D1D1F] hover:bg-[#F2F2F7] text-[#48484A]'
                          }`}
                        >
                          <Link
                            href={item.href}
                            onClick={() => {
                              setIsBankOpen(true);
                              closeMobile();
                            }}
                            className="flex items-center space-x-3 truncate flex-1 focus:outline-hidden"
                          >
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isBankActive ? 'text-white' : 'text-[#86868B]'
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsBankOpen((prev) => !prev);
                            }}
                            aria-label={isBankOpen ? 'Collapse Bank & Accounts submenu' : 'Expand Bank & Accounts submenu'}
                            title={isBankOpen ? 'Collapse submenu' : 'Expand submenu'}
                            className={`p-1.5 -mr-1 rounded-lg transition-colors flex items-center justify-center focus:outline-hidden ${
                              isBankActive
                                ? 'hover:bg-white/20 active:bg-white/30 text-white'
                                : 'hover:bg-[#E5E5EA] active:bg-[#D1D1D6] text-[#86868B]'
                            }`}
                          >
                            {isBankOpen ? (
                              <ChevronDown className="w-4 h-4 shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 shrink-0" />
                            )}
                          </button>
                        </div>

                        {isBankOpen && (
                          <div className="pl-3 pr-1 py-1 space-y-0.5 border-l-2 border-[#007AFF]/20 ml-5 my-1">
                            {BANK_SHEETS_SUB_NAV.map((sub) => {
                              const isSubActive = pathname === sub.href || (sub.isMain && pathname === '/bank');
                              return (
                                <Link
                                  key={sub.href}
                                  href={sub.href}
                                  onClick={closeMobile}
                                  className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    isSubActive
                                      ? 'bg-[#007AFF]/10 text-[#007AFF] font-bold'
                                      : 'text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7]'
                                  }`}
                                >
                                  <span className="truncate">{sub.label}</span>
                                  {sub.isMain && (
                                    <span className="text-[9px] px-1 py-0.2 bg-[#34C759]/10 text-[#34C759] rounded font-bold">
                                      Main
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }

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
      </aside>
    </>
  );
}
