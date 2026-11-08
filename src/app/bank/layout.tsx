'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Landmark, ArrowRight, ShieldCheck } from 'lucide-react';

const BANK_ACCOUNTS = [
  { name: 'Bank Balance', slug: 'bank-balance', type: 'MAIN', isPrimary: true },
  { name: 'DCO', slug: 'dco', type: 'SUPPORTING' },
  { name: 'Profit Sharing', slug: 'profit-sharing', type: 'SUPPORTING' },
  { name: 'Pending Payment', slug: 'pending-payment', type: 'SUPPORTING' },
  { name: 'Harish GS', slug: 'harish-gs', type: 'SUPPORTING' },
  { name: 'Expense', slug: 'expense', type: 'SUPPORTING' },
  { name: 'SST', slug: 'sst', type: 'SUPPORTING' },
  { name: 'ECO Travels', slug: 'eco-travels', type: 'SUPPORTING' },
  { name: 'EURO-Amz', slug: 'euro-amz', type: 'SUPPORTING' },
  { name: 'O2', slug: 'o2', type: 'SUPPORTING' },
  { name: 'ORIX -Parexel', slug: 'orix-parexel', type: 'SUPPORTING' },
  { name: 'ANP-HCL', slug: 'anp-hcl', type: 'SUPPORTING' },
];

export default function BankLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#E5E5EA]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center text-[#007AFF] shadow-2xs">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#1D1D1F]">
                Bank & Accounts Management
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/10 text-[#34C759] border border-[#34C759]/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Reconciled
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              Consolidated Master Bank Balance & 11 Supporting Financial Accounts
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-[#86868B]">
          <span>Primary Source:</span>
          <span className="font-medium text-[#1D1D1F] bg-[#FFFFFF] px-2.5 py-1 rounded-lg border border-[#E5E5EA] shadow-2xs">
            Bank And Balance Details-2025.xlsx
          </span>
        </div>
      </div>

      {/* 12-Account Horizontal Navigation Pill Bar */}
      <div className="overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center space-x-1.5 min-w-max p-1 bg-[#E5E5EA]/60 rounded-2xl backdrop-blur-md border border-[#E5E5EA]">
          {BANK_ACCOUNTS.map((acc) => {
            const href = `/bank/${acc.slug}`;
            const isActive = pathname === href || (acc.slug === 'bank-balance' && pathname === '/bank');

            return (
              <Link
                key={acc.slug}
                href={href}
                className={`relative px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all duration-150 whitespace-nowrap flex items-center space-x-1.5 ${
                  isActive
                    ? 'bg-[#FFFFFF] text-[#007AFF] font-bold shadow-sm'
                    : 'text-[#48484A] hover:text-[#1D1D1F] hover:bg-[#FFFFFF]/50'
                }`}
              >
                {acc.isPrimary && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#007AFF]' : 'bg-[#34C759]'}`} />
                )}
                <span>{acc.name}</span>
                {acc.isPrimary && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isActive ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-[#E5E5EA] text-[#86868B]'}`}>
                    Main
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Child Account Content */}
      <div>{children}</div>
    </div>
  );
}

