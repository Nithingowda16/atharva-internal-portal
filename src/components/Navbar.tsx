'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Database, RefreshCw, Sparkles } from 'lucide-react';

interface NavbarProps {
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
}

export default function Navbar({ title, subtitle, onRefresh }: NavbarProps) {
  return (
    <header className="h-16 bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#E5E5EA] px-6 flex items-center justify-between sticky top-0 z-20 transition-all">
      <div>
        <h2 className="text-sm font-semibold text-[#1D1D1F] tracking-tight">{title || 'Finance Portal'}</h2>
        {subtitle && <p className="text-[11px] text-[#86868B]">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-2.5">
        {/* Live Status Indicator */}
        <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#EAF9EE] border border-[#D2F4DA] text-[#34C759] text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
          <span>Live</span>
        </div>

        {/* Excel Reconciliation Badge */}
        <div className="hidden sm:flex items-center px-3 py-1 rounded-full bg-[#F2F2F7] border border-[#E5E5EA] text-[#1D1D1F] text-[11px] font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#34C759]" />
          <span>Excel Reconciled (₹0.00 Var)</span>
        </div>

        {/* 39 #REF! Errors Flagged Badge */}
        <Link
          href="/raw-cells?onlyRef=true"
          className="flex items-center px-3 py-1 rounded-full bg-[#FFF5E5] border border-[#FFE4B8] text-[#FF9F0A] text-[11px] font-medium hover:bg-[#FFEECF] transition-colors"
          title="Review 39 original Excel formula errors"
        >
          <AlertCircle className="w-3.5 h-3.5 mr-1 text-[#FF9F0A]" />
          <span>39 #REF! Errors Flagged</span>
        </Link>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
}
