'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { isDesktopCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] text-[#1D1D1F]">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-w-0 w-full overflow-x-hidden overflow-y-auto custom-scrollbar transition-[margin-left] duration-250 ease-in-out ml-0 ${
          isDesktopCollapsed ? 'md:ml-[76px]' : 'md:ml-[260px]'
        }`}
      >
        <main className="flex-1 p-3.5 sm:p-5 lg:p-8 w-full max-w-full">
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
    return <main className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F]">{children}</main>;
  }

  return (
    <SidebarProvider user={user}>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
