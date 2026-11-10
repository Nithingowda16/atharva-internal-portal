'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  action?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onRefresh, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 select-none">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#86868B] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {action}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border border-[#E5E5EA] hover:bg-[#F2F2F7] text-xs font-semibold text-[#1D1D1F] shadow-2xs transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}

