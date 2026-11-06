'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import {
  Scissors,
  Search,
  Filter,
  Download,
  AlertCircle,
  Tag,
  Calendar,
  Plus
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF } from '@/lib/exportUtils';

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  useEffect(() => {
    fetchAdjustments();
  }, [categoryFilter]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports?type=vehicle_statement');
      const data = await res.json();
      
      // Flatten all adjustments across records
      const flatAdjustments: any[] = [];
      for (const rec of data.data || []) {
        for (const adj of rec.adjustments || []) {
          flatAdjustments.push({
            ...adj,
            periodName: rec.period?.periodName || 'August 2026',
            registrationNumber: rec.vehicle?.registrationNumber || 'N/A',
            sectionIndex: rec.sectionIndex,
          });
        }
      }
      setAdjustments(flatAdjustments);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const uniqueCategories = Array.from(new Set(adjustments.map((a) => a.category))).sort();

  const filtered = adjustments.filter((a) => {
    const matchesCat = categoryFilter === 'ALL' || a.category === categoryFilter;
    const matchesSearch =
      a.category.toLowerCase().includes(search.toLowerCase()) ||
      a.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (a.notes && a.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    const exportData = filtered.map((a) => ({
      Period: a.periodName,
      Section: a.sectionIndex,
      'Vehicle Registration': a.registrationNumber,
      Category: a.category,
      Type: a.amount < 0 ? 'Deduction' : 'Addition',
      'Amount (₹)': a.amount,
      Formula: a.formulaString || 'N/A',
      Notes: a.notes || '',
    }));

    if (format === 'xlsx') {
      exportToExcel(exportData, 'Adjustments', 'Atharva_Financial_Adjustments');
    } else if (format === 'csv') {
      exportToCSV(exportData, 'Atharva_Financial_Adjustments');
    } else {
      exportToPDF({
        title: 'Financial Adjustments & Deductions Statement',
        subtitle: `ATHARVA TRAVELS • Filter: ${categoryFilter} • Total Records: ${filtered.length}`,
        headers: ['Period', 'Vehicle', 'Category', 'Type', 'Amount (₹)', 'Formula / Notes'],
        rows: filtered.map((a) => [
          a.periodName,
          a.registrationNumber,
          a.category,
          a.amount < 0 ? 'Deduction' : 'Addition',
          `₹${a.amount.toFixed(2)}`,
          a.formulaString || a.notes || '-',
        ]),
        filename: 'Atharva_Adjustments_Report',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto selection:bg-[#B3D7FF]">
      <Navbar
        title="Adjustments & Deductions Ledger"
        subtitle="Manage Fuel Advances, 3% Handling, TDS 1%, GPS, Office Charges & Custom Adjustments"
        onRefresh={fetchAdjustments}
      />

      {/* Apple Styled Filter & Action Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-[22px] border border-[#E5E5EA] shadow-apple-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search category, vehicle or notes..."
              className="w-full pl-9 pr-4 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs text-[#1D1D1F] focus:bg-[#FFFFFF] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#86868B] font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#F2F2F7] border border-[#E5E5EA] rounded-full text-xs font-medium text-[#1D1D1F] focus:outline-hidden focus:ring-2 focus:ring-[#007AFF] transition-all cursor-pointer"
            >
              <option value="ALL">All Categories ({uniqueCategories.length})</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end md:self-auto">
          <button
            onClick={() => handleExport('xlsx')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#34C759]" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#007AFF]" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] hover:bg-[#E5E5EA] text-[#1D1D1F] text-xs font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      {/* Apple Styled Table Card */}
      <div className="bg-[#FFFFFF] rounded-[24px] border border-[#E5E5EA] shadow-apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#F2F2F7] text-[#1D1D1F] font-semibold border-b border-[#E5E5EA]">
              <tr>
                <th className="py-3 px-3">Period</th>
                <th className="py-3 px-3 w-14 text-center">Sec #</th>
                <th className="py-3 px-4">Vehicle Registration</th>
                <th className="py-3 px-4">Adjustment Category</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-4 text-right">Adjustment Amount (₹)</th>
                <th className="py-3 px-4">Formula String</th>
                <th className="py-3 px-4">Notes / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#86868B]">
                    Loading financial adjustments from database...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#86868B]">
                    No adjustments found matching current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const isDeduction = a.amount < 0;
                  return (
                    <tr key={a.id} className="hover:bg-[#F2F2F7]/50 transition-colors">
                      <td className="py-3 px-3 font-semibold text-[#1D1D1F]">{a.periodName}</td>
                      <td className="py-3 px-3 text-center font-mono text-[#86868B]">{a.sectionIndex}</td>
                      <td className="py-3 px-4 font-bold text-[#1D1D1F] font-mono">{a.registrationNumber}</td>
                      <td className="py-3 px-4 font-semibold text-[#1D1D1F]">{a.category}</td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                            isDeduction
                              ? 'bg-[#FFF0EF] text-[#FF3B30] border-[#FFD0CE]'
                              : 'bg-[#EAF9EE] text-[#34C759] border-[#D2F4DA]'
                          }`}
                        >
                          {isDeduction ? 'Deduction' : 'Addition'}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums ${
                          isDeduction ? 'text-[#FF3B30]' : 'text-[#34C759]'
                        }`}
                      >
                        ₹{Math.abs(a.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-[#86868B] font-mono text-[11px] truncate max-w-xs">
                        {a.formulaString || '-'}
                      </td>
                      <td className="py-3 px-4 text-[#86868B] truncate max-w-xs">{a.notes || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
