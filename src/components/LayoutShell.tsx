'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { isDesktopCollapsed } = useSidebar();

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F5F5F7] text-[#1D1D1F]">
      {/* 1. TOP HEADER BAR: Full width at the very top, exactly like Google Skills */}
      <Navbar />

      {/* 2. BODY CONTAINER: Sidebar on left + Main Content on right */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <Sidebar />
        <main
          className={`flex-1 p-3.5 sm:p-5 lg:p-8 w-full max-w-full overflow-y-auto custom-scrollbar transition-[margin-left] duration-250 ease-in-out ml-0 ${
            isDesktopCollapsed ? 'md:ml-[76px]' : 'md:ml-[260px]'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function LayoutShell({
  user,
  children,
}: {
  user: any;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <ThemeProvider>
        <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">{children}</main>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SidebarProvider user={user}>
        <LayoutInner>{children}</LayoutInner>
      </SidebarProvider>
    </ThemeProvider>
  );
}
