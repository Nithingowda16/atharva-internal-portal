'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

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
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7] text-[#1D1D1F]">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col ml-64 overflow-y-auto custom-scrollbar">
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
