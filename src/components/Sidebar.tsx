'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Truck,
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
  Landmark,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
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
        { label: 'Vehicle Management', href: '/vehicles', icon: Truck, roles: ['SUPER_ADMIN', 'FINANCE_MANAGER', 'OPERATIONS'] },
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
    <aside className="w-64 bg-[#FFFFFF] border-r border-[#E5E5EA] text-[#1D1D1F] flex flex-col h-screen fixed left-0 top-0 z-30 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E5E5EA] flex items-center space-x-3 bg-[#FFFFFF]">
        <div className="w-10 h-10 rounded-xl bg-[#FFFFFF] border border-[#E5E5EA] p-1 flex items-center justify-center shadow-2xs shrink-0 overflow-hidden">
          <img src="/logo.png" alt="Atharva Travels" className="w-full h-full object-contain" />
        </div>
        <div className="leading-tight truncate">
          <h1 className="font-bold text-[#1D1D1F] text-[13px] tracking-tight">
            ATHARVA TRAVELS
          </h1>
          <p className="text-[11px] text-[#86868B] font-medium truncate">Finance Portal</p>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
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
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[#007AFF] text-white shadow-apple-btn font-semibold'
                        : 'text-[#1D1D1F] hover:bg-[#F2F2F7] text-[#48484A]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-white' : 'text-[#86868B]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#E5E5EA] bg-[#FBFBFC]">
        <div className="flex items-center justify-between p-2 rounded-2xl bg-[#FFFFFF] border border-[#E5E5EA] shadow-2xs">
          <div className="flex items-center space-x-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] flex items-center justify-center text-[#007AFF] text-xs font-semibold">
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-[#1D1D1F] truncate">{user?.name || 'Authorized User'}</p>
              <p className="text-[10px] text-[#86868B] truncate font-medium">{user?.role?.replace('_', ' ') || 'Finance'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-full text-[#86868B] hover:text-[#FF3B30] hover:bg-[#FEECEB] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
